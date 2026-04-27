<?php

declare(strict_types=1);

// ============ SÉCURITÉ : HEADERS HTTP ============
// Protection contre les attaques XSS, clickjacking, MIME sniffing

header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// CORS - Autoriser les requêtes depuis le frontend (InfinityFree)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gérer les preflight requests OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Rate limiting simple basé sur session (1 req/sec)
session_start();
$currentTime = microtime(true);
$lastRequest = $_SESSION['last_request'] ?? 0;
$minInterval = 1.0; // 1 seconde minimum entre requêtes

if (($currentTime - $lastRequest) < $minInterval) {
    http_response_code(429); // Too Many Requests
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Veuillez patienter.']);
    exit();
}

$_SESSION['last_request'] = $currentTime;

// ============ CONFIGURATION ============
// Configuration centralisée - SSOT

class Config
{
    public const DIR_PLAYLISTS = __DIR__ . '/../storage/playlists/';
    public const EXT_CSV = 'csv';
    public const FILE_CURRENT = '.';
    public const FILE_PARENT = '..';
    public const PARAM_PATH = 'path';
    public const PARAM_ACTION = 'action';
    public const PARAM_FILE = 'file';
    public const PARAM_DEPTH = 'depth';
    public const DEFAULT_DEPTH = 4;
    public const MSG_ERROR_DIR = 'Erreur: Dossier inaccessible.';
    public const MSG_ERROR_PLAYLIST = 'Erreur: Playlist non autorisée.';
    public const MSG_ERROR_READ = 'Erreur: Impossible de lire le fichier.';
    public const MSG_ERROR_DATA = 'Erreur: Aucune donnée valide trouvée.';
    public const MSG_ERROR_ACTION = 'Erreur: Action non reconnue.';
}

// ============ PATH SANITIZER ============
// Classe utilitaire pour sécuriser les chemins de fichiers

final class PathSanitizer
{
    private const ALLOWED_CHARS = '/a-zA-Z0-9._-';
    
    /**
     * Nettoie et valide un chemin d'accès
     */
    public static function sanitize(string $path): string
    {
        // Supprimer les caractères interdits
        $clean = preg_replace('[^' . self::ALLOWED_CHARS . ']', '', $path);
        
        // Empêcher la navigation parentale
        $clean = str_replace(['..', './'], '', $clean);
        
        // Normaliser les séparateurs
        $clean = str_replace('\\', '/', $clean);
        
        // Supprimer les slashes multiples
        $clean = preg_replace('#/+#', '/', $clean);
        
        return trim($clean, '/');
    }
    
    /**
     * Vérifie si un chemin est sécurisé
     */
    public static function isSafe(string $path): bool
    {
        $sanitized = self::sanitize($path);
        return $sanitized === $path || empty($path);
    }
}

// ============ FONCTIONS UTILITAIRES ============

/**
 * Réponse JSON standardisée
 */
function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Scanner récursif de dossiers
 */
function scanDirectory(string $basePath, int $maxDepth = 4, int $currentDepth = 0): array
{
    $result = [];
    
    if ($currentDepth >= $maxDepth) {
        return $result;
    }
    
    $fullPath = Config::DIR_PLAYLISTS . $basePath;
    
    if (!is_dir($fullPath)) {
        return $result;
    }
    
    $items = scandir($fullPath);
    
    foreach ($items as $item) {
        if ($item === Config::FILE_CURRENT || $item === Config::FILE_PARENT) {
            continue;
        }
        
        $itemPath = $basePath ? $basePath . '/' . $item : $item;
        $fullItemPath = $fullPath . '/' . $item;
        
        if (is_dir($fullItemPath)) {
            $subItems = scanDirectory($itemPath, $maxDepth, $currentDepth + 1);
            $result[] = [
                'type' => 'folder',
                'name' => $item,
                'path' => $itemPath,
                'children' => $subItems
            ];
        } elseif (is_file($fullItemPath) && pathinfo($item, PATHINFO_EXTENSION) === Config::EXT_CSV) {
            $result[] = [
                'type' => 'file',
                'name' => $item,
                'path' => $itemPath,
                'size' => filesize($fullItemPath)
            ];
        }
    }
    
    // Trier: dossiers d'abord, puis fichiers
    usort($result, function($a, $b) {
        if ($a['type'] !== $b['type']) {
            return $a['type'] === 'folder' ? -1 : 1;
        }
        return strcmp($a['name'], $b['name']);
    });
    
    return $result;
}

/**
 * Lire une playlist CSV
 */
function readPlaylist(string $path): array
{
    $sanitizedPath = PathSanitizer::sanitize($path);
    $fullPath = Config::DIR_PLAYLISTS . $sanitizedPath;
    
    if (!file_exists($fullPath) || !is_readable($fullPath)) {
        return ['error' => Config::MSG_ERROR_READ];
    }
    
    $content = file_get_contents($fullPath);
    if ($content === false) {
        return ['error' => Config::MSG_ERROR_READ];
    }
    
    $lines = explode("\n", trim($content));
    $tracks = [];
    
    foreach ($lines as $lineNumber => $line) {
        $line = trim($line);
        
        // Ignorer lignes vides et commentaires
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        $parts = str_getcsv($line);
        
        if (count($parts) >= 2) {
            $tracks[] = [
                'id' => $lineNumber,
                'title' => trim($parts[0]),
                'youtube_id' => trim($parts[1]),
                'duration' => trim($parts[2] ?? ''),
                'artist' => trim($parts[3] ?? '')
            ];
        }
    }
    
    if (empty($tracks)) {
        return ['error' => Config::MSG_ERROR_DATA];
    }
    
    return ['tracks' => $tracks, 'count' => count($tracks)];
}

// ============ GESTION DES REQUÊTES ============

$action = $_GET[Config::PARAM_ACTION] ?? '';
$path = $_GET[Config::PARAM_PATH] ?? '';

switch ($action) {
    case 'scan':
        $depth = (int)($_GET[Config::PARAM_DEPTH] ?? Config::DEFAULT_DEPTH);
        $folders = scanDirectory('', $depth);
        jsonResponse(['success' => true, 'folders' => $folders]);
        break;
        
    case 'load':
        if (empty($path)) {
            jsonResponse(['success' => false, 'error' => 'Chemin requis'], 400);
        }
        
        $playlistData = readPlaylist($path);
        
        if (isset($playlistData['error'])) {
            jsonResponse(['success' => false, 'error' => $playlistData['error']], 404);
        }
        
        jsonResponse(['success' => true, 'playlist' => $playlistData]);
        break;
        
    case 'save':
        // Implémentation future pour sauvegarder une playlist
        jsonResponse(['success' => false, 'error' => 'Fonctionnalité non implémentée'], 501);
        break;
        
    default:
        jsonResponse(['success' => false, 'error' => Config::MSG_ERROR_ACTION], 400);
}

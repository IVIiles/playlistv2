<?php

declare(strict_types=1);

// ============ HEADERS CORS SÉCURISÉS (AVANT TOUT) ============
// ⚠️ Aucun espace ou ligne vide avant <?php
// ⚠️ Aucun echo/print avant ces headers

header('Content-Type: application/json');

$allowedOrigins = [
    'https://milescorp.great-site.net',
    'http://localhost',
    'http://127.0.0.1'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Si HTTP_ORIGIN est vide, vérifier HTTP_HOST ou REFERER
if (empty($origin)) {
$host = $_SERVER['HTTP_HOST'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
if (!empty($host)) {
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $host;
} elseif (!empty($referer)) {
$originParts = parse_url($referer);
if ($originParts && isset($originParts['scheme']) && isset($originParts['host'])) {
$origin = $originParts['scheme'] . '://' . $originParts['host'];
}
}
}

// Vérifier si l'origine est autorisée
$isAllowed = false;
foreach ($allowedOrigins as $allowed) {
if (strpos($origin, $allowed) === 0 || $origin === $allowed) {
$isAllowed = true;
break;
}
}

if (!$isAllowed && !empty($origin)) {
http_response_code(403);
echo json_encode(['success' => false, 'error' => 'Origine non autorisée: ' . $origin]);
exit;
}

if (empty($origin)) {
$origin = $allowedOrigins[0];
}
header('Access-Control-Allow-Origin: ' . $origin);

header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

// ============ CSRF PROTECTION ============
session_start();

function validateCsrfToken(): bool
{
    // Les requêtes GET sont exemptées (lecture seule)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return true;
    }
    
    // Pour les autres méthodes, vérifier le token
    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    
    if (empty($sessionToken) || empty($headerToken)) {
        return false;
    }
    
    return hash_equals($sessionToken, $headerToken);
}

// Vérification du token CSRF pour les méthodes modifiantes
if (!validateCsrfToken()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Token CSRF invalide ou manquant']);
    exit;
}

// ============ CONFIGURATION ============
// API de scraping YouTube - Inclusion sécurisée clé API

$apiKeyFile = __DIR__ . '/api_yt.php';

// Validation existence fichier
if (!file_exists($apiKeyFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Fichier de configuration API manquant']);
    exit;
}

// Inclusion unique avec capture valeur
$apiKey = require_once $apiKeyFile;

// Validation type et longueur minimale
if (empty($apiKey) || !is_string($apiKey) || strlen($apiKey) < 20) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Clé API non configurée ou invalide']);
    exit;
}

// Validation format clé API YouTube (AIza...{35})
if (!preg_match('/^AIza[0-9A-Za-z_-]{35}$/', $apiKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Format de clé API invalide']);
    exit;
}

class ScrapperConfig
{
    public const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
    public const PARAM_URL = 'url';
    public const PARAM_ACTION = 'action';
    public const MAX_RESULTS = 50;
    public const MSG_ERROR_URL = 'Erreur: URL de playlist invalide.';
    public const MSG_ERROR_API = 'Erreur: Échec API YouTube.';
    public const MSG_ERROR_EMPTY = 'Erreur: Playlist vide ou non trouvée.';
}

// ============ RATE LIMITING ============
// Limite le nombre de requêtes par IP

function checkRateLimit(string $ip, int $maxRequests = 5, int $window = 60): bool
{
    $key = 'rate_limit_' . preg_replace('/[^a-zA-Z0-9]/', '_', $ip);
    $file = sys_get_temp_dir() . '/' . $key . '.txt';
    
    $requests = [];
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $requests = json_decode($content, true) ?: [];
        // Nettoyer les anciennes requêtes
        $requests = array_filter($requests, fn($t) => $t > time() - $window);
    }
    
    if (count($requests) >= $maxRequests) {
        return false;
    }
    
    $requests[] = time();
    file_put_contents($file, json_encode(array_values($requests)));
    return true;
}

// ============ METADATA DETECTOR ============
// Classe utilitaire pour détection artiste/album

class MetadataDetector
{
// ============ FETCH PLAYLIST TITLE ============
 // Récupère le titre de la playlist via API YouTube
    public static function fetchPlaylistTitle(string $playlistId, string $apiKey): ?string
    {
        $url = ScrapperConfig::YOUTUBE_API_BASE . "/playlists?part=snippet&id=$playlistId&key=$apiKey";
        $context = stream_context_create(['http' => ['timeout' => 10]]);
        
        // Gestion explicite des erreurs (COR-005)
        $response = file_get_contents($url, false, $context);
        if ($response === false) {
            error_log('Erreur fetchPlaylistTitle: impossible de récupérer le titre');
            return null;
        }
        
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Erreur fetchPlaylistTitle: JSON invalide');
            return null;
        }
        
        return $data['items'][0]['snippet']['title'] ?? null;
    }

    // ============ CLEAN ALBUM NAME ============
    // Extrait le nom d'album depuis titre playlist
    public static function cleanAlbumName(?string $playlistTitle, string $artist): string
    {
        if (empty($playlistTitle)) {
            return 'Playlist Importée';
        }
        // Retirer l'artiste s'il est en préfixe
        $album = preg_replace('/^' . preg_quote($artist, '/') . '\s*[-:]\s*/i', '', $playlistTitle);
        // Retirer suffixes communs
        $album = preg_replace('/\s*\((Official|Full|Complete|Best of|Audio|Video)[^)]*\)/i', '', $album);
        $album = trim($album);
        return !empty($album) ? $album : 'Playlist Importée';
    }

    // ============ DETECT DOMINANT ARTIST ============
    // Algorithme de vote majoritaire - si au moins 2 lignes avec même nom, on le prend
    public static function detectDominantArtist(array $videos): array
    {
        $artistVotes = [];
        $total = count($videos);

        // Phase 1 : Collecte des artistes extraits
        foreach ($videos as $video) {
            $parsed = parseTitle($video['title']);
            $artist = trim($parsed['artist'] ?? '');

            // Ignorer les artistes vides
            if (empty($artist)) {
                continue;
            }

            // Nettoyage : extraire artiste principal avant "feat"
            $mainArtist = $artist;
            if (preg_match('/^(.+?)\s+(feat\.?|ft\.?|featuring|with)\s+/i', $artist, $matches)) {
                $mainArtist = trim($matches[1]);
            }

            // Vote (insensible à la casse)
            $normalized = strtolower(trim($mainArtist));
            if (!empty($normalized)) {
                if (!isset($artistVotes[$normalized])) {
                    $artistVotes[$normalized] = ['original' => $mainArtist, 'count' => 0];
                }
                $artistVotes[$normalized]['count']++;
            }
        }

        // Phase 2 : Détection du dominant (critère : au moins 2 occurrences)
        $dominantArtist = null;
        $topArtist = null;
        if (!empty($artistVotes)) {
            // Trier par nombre de votes décroissant
            uasort($artistVotes, fn($a, $b) => $b['count'] <=> $a['count']);
            $topArtist = reset($artistVotes);

            // CRITÈRE : au moins 2 occurrences pour être dominant
            if ($topArtist['count'] >= 2) {
                $dominantArtist = $topArtist['original'];
            }
        }

        // Phase 3 : Application aux vidéos
        foreach ($videos as &$video) {
            $parsed = parseTitle($video['title']);
            $extractedArtist = trim($parsed['artist'] ?? '');

            // Cas 1 : Artiste déjà présent et différent du dominant (featuring)
            if (!empty($extractedArtist) && !empty($dominantArtist)) {
                $extractedLower = strtolower($extractedArtist);
                $dominantLower = strtolower($dominantArtist);

                // Si c'est un featuring ou artiste différent, garder l'original
                if (stripos($extractedLower, $dominantLower) === false && stripos($extractedLower, 'feat') !== false) {
                    $video['artist'] = $extractedArtist;
                    continue;
                }
            }

            // Cas 2 : Artiste vide ou même que dominant → utiliser dominant
            if (!empty($dominantArtist)) {
                $video['artist'] = $dominantArtist;
            } else {
                // Fallback : garder l'extrait s'il existe, sinon inconnu
                $video['artist'] = !empty($extractedArtist) ? $extractedArtist : 'Artiste Inconnu';
            }
        }

        // Libérer la référence
        unset($video);

        return [
            'artist' => $dominantArtist ?? 'Artiste Inconnu',
            'confidence' => $dominantArtist ? round(($topArtist['count'] / $total) * 100) : 0,
            'videos' => $videos
        ];
    }
}

// ============ PARSER URL ============
// Extraction ID playlist depuis URL

function extractPlaylistId(string $url): ?string
{
    $patterns = ['/[?&]list=([a-zA-Z0-9_-]+)/i'];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// ============ VALIDATION PLAYLIST ID ============
// Vérifie que l'ID playlist a un format YouTube valide

function validatePlaylistId(string $playlistId): bool
{
    // Format YouTube: lettres, chiffres, tirets et underscores (10+ caractères)
    return preg_match('/^[A-Za-z0-9_-]{10,}$/', $playlistId) === 1;
}

// ============ PARSER TITRE ============
// Séparation artist/title depuis titre YouTube

function parseTitle(string $fullTitle): array
{
    $separators = [' - ', ' | ', ' : ', ' – ', ' — '];
    
    foreach ($separators as $separator) {
        $index = strpos($fullTitle, $separator);
        if ($index !== false) {
            return [
                'artist' => substr($fullTitle, 0, $index),
                'songTitle' => substr($fullTitle, $index + strlen($separator))
            ];
        }
    }
    
    return ['artist' => '', 'songTitle' => $fullTitle];
}

// ============ GÉNÉRATEUR CSV ============
// Génère le contenu CSV

function generateCsv(array $videos): string
{
$csv = "id,title,artist,song_title,album\n";

foreach ($videos as $video) {
if (!is_array($video)) {
continue;
}

$id = str_replace('"', '""', $video['id'] ?? '');
$title = str_replace('"', '""', $video['title'] ?? '');
$artist = str_replace('"', '""', $video['artist'] ?? '');
$songTitle = str_replace('"', '""', $video['song_title'] ?? '');
$album = str_replace('"', '""', $video['album'] ?? 'Inconnu');
$csv .= "\"$id\",\"$title\",\"$artist\",\"$songTitle\",\"$album\"\n";
}

return "\xEF\xBB\xBF" . $csv;
}

// ============ SCRAPING ============
// Extraction des vidéos depuis playlist

function scrapePlaylist(string $playlistId, string $apiKey): array
{
    $videos = [];
    $nextPageToken = null;
    $pageCount = 0;
    
do {
 $url = ScrapperConfig::YOUTUBE_API_BASE
 . "/playlistItems?part=snippet&playlistId=$playlistId&key=$apiKey"
 . "&maxResults=" . ScrapperConfig::MAX_RESULTS;

 if ($nextPageToken) {
 $url .= "&pageToken=$nextPageToken";
 }

    $context = stream_context_create(['http' => ['timeout' => 10]]);
    
    // Gestion explicite des erreurs (COR-005)
    $response = file_get_contents($url, false, $context);
    
    if ($response === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => ScrapperConfig::MSG_ERROR_API, 'errorCode' => 'API_ERROR']);
        exit;
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Réponse API invalide (JSON corrompu)', 'errorCode' => 'JSON_ERROR']);
        exit;
    }

    if (isset($data['error'])) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $data['error']['message'] ?? ScrapperConfig::MSG_ERROR_API,
            'errorCode' => 'YOUTUBE_API_ERROR'
        ]);
        exit;
    }

    if (empty($data['items']) && $pageCount === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => ScrapperConfig::MSG_ERROR_EMPTY, 'errorCode' => 'EMPTY_PLAYLIST']);
        exit;
    }

    // Traitement des items
    foreach ($data['items'] as $item) {
if (!isset($item['snippet']['title']) || !isset($item['snippet']['resourceId']['videoId'])) {
continue;
}

$fullTitle = $item['snippet']['title'];
$parsed = parseTitle($fullTitle);

$videos[] = [
'id' => $item['snippet']['resourceId']['videoId'],
'title' => $fullTitle,
'artist' => $parsed['artist'] ?? '',
'song_title' => $parsed['songTitle'] ?? '',
'album' => 'Inconnu'
];
}
        
        $pageCount++;
        $nextPageToken = $data['nextPageToken'] ?? null;
        
        if ($nextPageToken) {
            usleep(100000);
        }
        
    } while ($nextPageToken);
    
    return $videos;
}

// ============ MAIN ============
// Point d'entrée API

// Rate limiting (COR-007) - avant le traitement
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!checkRateLimit($clientIp, 5, 60)) { // 5 requêtes max par minute
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Réessayez dans une minute.', 'errorCode' => 'RATE_LIMIT']);
    exit;
}

$action = $_GET[ScrapperConfig::PARAM_ACTION] ?? '';

if ($action !== 'scrape') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Action non reconnue.']);
    exit;
}

$url = $_GET[ScrapperConfig::PARAM_URL] ?? $_POST[ScrapperConfig::PARAM_URL] ?? '';

if (empty($url)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => ScrapperConfig::MSG_ERROR_URL]);
    exit;
}

$playlistId = extractPlaylistId($url);

// Validation du format de l'ID playlist (protection SSRF)
if (!$playlistId || !validatePlaylistId($playlistId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => ScrapperConfig::MSG_ERROR_URL]);
    exit;
}

$videos = scrapePlaylist($playlistId, $apiKey);

if (empty($videos)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => ScrapperConfig::MSG_ERROR_EMPTY]);
    exit;
}

// ============ DÉTECTION MÉTADONNÉES ============
// Détection artiste dominant et nom d'album

$detection = MetadataDetector::detectDominantArtist($videos);
$videos = $detection['videos'];
$dominantArtist = $detection['artist'];

// Récupération titre playlist pour nom album
$playlistTitle = MetadataDetector::fetchPlaylistTitle($playlistId, $apiKey);
$albumName = MetadataDetector::cleanAlbumName($playlistTitle, $dominantArtist);

// Construction nom fichier : "Artiste - Album.csv"
$filename = $dominantArtist . ' - ' . $albumName . '.csv';
// Nettoyage pour filesystem
$filename = preg_replace('/[<>:"\/\\|?*]/', '', $filename);

// ============ GÉNÉRATION CSV ============
$csv = generateCsv($videos);

// ============ RÉPONSE JSON ENRICHIE ============
echo json_encode([
    'success' => true,
    'count' => count($videos),
    'csv' => $csv,
    'detectedArtist' => $dominantArtist,
    'detectedAlbum' => $albumName,
    'suggestedFilename' => $filename,
    'confidence' => $detection['confidence']
]);
<?php

declare(strict_types=1);

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
// Gestionnaire de sécurité pour les chemins

class PathSanitizer
{
    // Nettoie un chemin utilisateur
    public static function clean(string $path): string
    {
        $path = trim($path, '/');
        $parts = $path ? explode('/', $path) : [];
        $cleanParts = [];

        foreach ($parts as $part) {
            $cleanPart = basename($part);
            if ($cleanPart && $cleanPart !== Config::FILE_CURRENT
                && $cleanPart !== Config::FILE_PARENT) {
                $cleanParts[] = $cleanPart;
            }
        }

        return implode('/', $cleanParts);
    }

    // Retourne un chemin sécurisé
    public static function getSafeDir(string $baseDir, string $userPath): string
    {
        $target = $baseDir . $userPath;
        if ($userPath !== '' && (!is_dir($target)
            || realpath($target) === false)) {
            return $baseDir;
        }
        return $userPath !== '' ? $target . '/' : $target;
    }

    // Vérifie qu'un fichier est dans le répertoire autorisé
    public static function isFileAllowed(
        string $baseDir,
        string $relativePath,
        string $filename
    ): bool {
        $safeDir = self::getSafeDir($baseDir, $relativePath);
        $filePath = $safeDir . basename($filename);
        $realPath = realpath($filePath);
        $realBaseDir = realpath($safeDir);

        return $realPath !== false
            && $realBaseDir !== false
            && strpos($realPath, $realBaseDir) === 0;
    }
}

// ============ PLAYLIST MANAGER ============
// Gestionnaire de données Playlist

class PlaylistManager
{
    private string $currentDir;
    private string $relativeCurrentPath;

    public function __construct(string $relativeCurrentPath)
    {
        $this->relativeCurrentPath = $relativeCurrentPath;
        $this->currentDir = PathSanitizer::getSafeDir(
            Config::DIR_PLAYLISTS,
            $relativeCurrentPath
        );

        if (realpath($this->currentDir) === realpath(Config::DIR_PLAYLISTS)
            && $relativeCurrentPath !== '') {
            $this->relativeCurrentPath = '';
        }
    }

    // Retourne les breadcrumbs
    public function getBreadcrumbs(): array
    {
        $breadcrumbs = [];
        $parts = $this->relativeCurrentPath
            ? explode('/', $this->relativeCurrentPath)
            : [];
        $accumulated = '';

        foreach ($parts as $part) {
            $accumulated .= ($accumulated ? '/' : '') . $part;
            $breadcrumbs[] = ['name' => $part, 'path' => $accumulated];
        }
        return $breadcrumbs;
    }

    // Scan le répertoire courant
    public function scanDirectory(): array
    {
        $folders = [];
        $files = [];

        if (is_dir($this->currentDir)) {
            $items = scandir($this->currentDir) ?: [];
            foreach ($items as $item) {
                if ($item === Config::FILE_CURRENT
                    || $item === Config::FILE_PARENT) {
                    continue;
                }

                $fullPath = $this->currentDir . $item;
                if (is_dir($fullPath)) {
                    $folders[] = $item;
                } elseif (pathinfo($item, PATHINFO_EXTENSION)
                    === Config::EXT_CSV) {
                    $files[] = $item;
                }
            }
        }
        sort($folders);
        sort($files);

        return ['folders' => $folders, 'files' => $files];
    }

    // Charge les données CSV
    public function loadCsvData(string $filename, array $allowedFiles): array
    {
        if (!in_array($filename, $allowedFiles, true)) {
            http_response_code(403);
            die(Config::MSG_ERROR_PLAYLIST);
        }

        if (!PathSanitizer::isFileAllowed(
            Config::DIR_PLAYLISTS,
            $this->relativeCurrentPath,
            $filename
        )) {
            http_response_code(403);
            die(Config::MSG_ERROR_PLAYLIST);
        }

        $filePath = $this->currentDir . $filename;
        if (!file_exists($filePath)) {
            http_response_code(404);
            die(Config::MSG_ERROR_READ);
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            http_response_code(500);
            die(Config::MSG_ERROR_READ);
        }

        array_shift($lines);

        $videos = [];
        foreach ($lines as $line) {
            $row = str_getcsv($line);
            if (count($row) < 4) {
                continue;
            }

            $id = trim($row[0]);
            if (empty($id) || strtolower($id) === 'id') {
                continue;
            }

$videos[] = [
'id' => $id,
'title' => trim($row[1]),
'artist' => trim($row[2]),
'song_title' => trim($row[3]),
'album' => (count($row) >= 5) ? trim($row[4]) : 'Inconnu'
];
        }

        if (empty($videos)) {
            http_response_code(404);
            die(Config::MSG_ERROR_DATA);
        }

        return $videos;
    }

    public function getCurrentPath(): string
    {
        return $this->relativeCurrentPath;
    }
}

// ============ ROUTEUR ============
// Gestion des requêtes API

function handleScan(): void
{
    $inputPath = isset($_GET[Config::PARAM_PATH])
        ? (string)$_GET[Config::PARAM_PATH]
        : '';
    $cleanPath = PathSanitizer::clean($inputPath);
    $manager = new PlaylistManager($cleanPath);

    $scanResult = $manager->scanDirectory();
    $breadcrumbs = $manager->getBreadcrumbs();

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'currentPath' => $manager->getCurrentPath(),
        'breadcrumbs' => $breadcrumbs,
        'folders' => $scanResult['folders'],
        'files' => $scanResult['files']
    ]);
}

// ============ SCAN RECURSIVE ============
// Retourne la structure complète des dossiers en une requête

function handleScanRecursive(): void
{
    $inputDepth = isset($_GET[Config::PARAM_DEPTH])
        ? (int)$_GET[Config::PARAM_DEPTH]
        : Config::DEFAULT_DEPTH;

    $depth = max(1, min($inputDepth, Config::DEFAULT_DEPTH));

    $tree = buildDirectoryTree(Config::DIR_PLAYLISTS, '', $depth);

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'tree' => $tree
    ]);
}

// Construit l'arbre récursivement jusqu'à profondeur N
function buildDirectoryTree(string $baseDir, string $relativePath, int $depth): array
{
    $tree = [
        'folders' => [],
        'files' => []
    ];

    $fullPath = $baseDir . ($relativePath ? $relativePath . '/' : '');

    if (!is_dir($fullPath)) {
        return $tree;
    }

    $items = scandir($fullPath) ?: [];

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $itemPath = $fullPath . $item;

        if (is_dir($itemPath)) {
            if ($depth > 1) {
                $childRelativePath = $relativePath ? $relativePath . '/' . $item : $item;
                $tree['folders'][$item] = buildDirectoryTree($baseDir, $childRelativePath, $depth - 1);
            } else {
                $tree['folders'][$item] = ['folders' => [], 'files' => []];
            }
        } elseif (pathinfo($item, PATHINFO_EXTENSION) === Config::EXT_CSV) {
            $tree['files'][] = $item;
        }
    }

    ksort($tree['folders']);
    sort($tree['files']);
    return $tree;
}

function handlePlaylist(): void
{
    $inputPath = isset($_GET[Config::PARAM_PATH])
        ? (string)$_GET[Config::PARAM_PATH]
        : '';
    $inputFile = isset($_GET[Config::PARAM_FILE])
        ? basename((string)$_GET[Config::PARAM_FILE])
        : '';

    $cleanPath = PathSanitizer::clean($inputPath);
    $manager = new PlaylistManager($cleanPath);
    $scanResult = $manager->scanDirectory();

    $videos = [];
    if ($inputFile !== '') {
        $videos = $manager->loadCsvData($inputFile, $scanResult['files']);
    }

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'currentPath' => $manager->getCurrentPath(),
        'selectedFile' => $inputFile,
        'videos' => $videos,
        'hasVideos' => !empty($videos)
    ]);
}

// ============ RECENT ============
// Retourne les 20 derniers fichiers CSV modifiés

function handleRecent(): void {
    $files = [];
    
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(Config::DIR_PLAYLISTS, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'csv') {
                $relativePath = str_replace(Config::DIR_PLAYLISTS, '', $file->getPathname());
                $relativePath = ltrim($relativePath, '/');
                $files[] = [
                    'path' => $relativePath,
                    'filename' => $file->getFilename(),
                    'modified' => $file->getMTime()
                ];
            }
        }
    } catch (Exception $e) {
        error_log('handleRecent error: ' . $e->getMessage());
    }
    
    usort($files, fn($a, $b) => $b['modified'] - $a['modified']);
    $top20 = array_slice($files, 0, 20);
    
    foreach ($top20 as &$file) {
        $parts = explode('/', trim($file['path'], '/'));
        $file['style'] = $parts[1] ?? '';
        
        $file['folderPath'] = implode('/', array_slice($parts, 0, -1));
        
        $csvPath = Config::DIR_PLAYLISTS . $file['path'];
        $file['artist'] = '';
        $file['album'] = '';
        
        if (file_exists($csvPath)) {
            try {
                $handle = fopen($csvPath, 'r');
                if ($handle !== false) {
                    $headers = fgetcsv($handle);
                    $firstRow = fgetcsv($handle);
                    fclose($handle);
                    
if ($firstRow && count($firstRow) >= 4) {
$file['artist'] = trim($firstRow[2] ?? '');
$file['album'] = (count($firstRow) >= 5) ? trim($firstRow[4]) : 'Inconnu';
}
                }
            } catch (Exception $e) {
                error_log('handleRecent fopen error: ' . $e->getMessage());
            }
        }
    }
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'files' => $top20]);
}

// ============ SEARCH ============
// Recherche dans les fichiers CSV

function handleSearch(): void {
    $query = isset($_GET['q']) ? strtolower(trim($_GET['q'])) : '';
    $fields = isset($_GET['fields']) ? explode(',', $_GET['fields']) : ['artist'];
    
    if (empty($query)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'files' => []]);
        return;
    }
    
    $results = [];
    $queryLower = strtolower($query);
    
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(Config::DIR_PLAYLISTS, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'csv') {
                $relativePath = str_replace(Config::DIR_PLAYLISTS, '', $file->getPathname());
                $relativePath = ltrim($relativePath, '/');
                $filename = $file->getFilename();
                $filenameNoExt = pathinfo($filename, PATHINFO_FILENAME);
                
                $parts = explode('/', trim($relativePath, '/'));
                $folderPath = implode('/', array_slice($parts, 0, -1));
                
                $match = false;
                
                foreach ($fields as $field) {
                    $field = trim($field);
                    
                    if ($field === 'artist') {
                        $csvPath = Config::DIR_PLAYLISTS . $relativePath;
                        if (file_exists($csvPath)) {
                            try {
                                $handle = fopen($csvPath, 'r');
                                if ($handle !== false) {
                                    fgetcsv($handle);
                                    while (($row = fgetcsv($handle)) !== false) {
                                        if (count($row) >= 4 && stripos($row[2] ?? '', $queryLower) !== false) {
                                            $match = true;
                                            break;
                                        }
                                    }
                                    fclose($handle);
                                }
                            } catch (Exception $e) {
                                error_log('handleSearch artist error: ' . $e->getMessage());
                            }
                        }
                    } elseif ($field === 'album') {
                        if (stripos($filenameNoExt, $queryLower) !== false) {
                            $match = true;
                        }
                    } elseif ($field === 'title') {
                        $csvPath = Config::DIR_PLAYLISTS . $relativePath;
                        if (file_exists($csvPath)) {
                            try {
                                $handle = fopen($csvPath, 'r');
                                if ($handle !== false) {
                                    fgetcsv($handle);
                                    while (($row = fgetcsv($handle)) !== false) {
                                        if (count($row) >= 4 && stripos($row[3] ?? '', $queryLower) !== false) {
                                            $match = true;
                                            break;
                                        }
                                    }
                                    fclose($handle);
                                }
                            } catch (Exception $e) {
                                error_log('handleSearch title error: ' . $e->getMessage());
                            }
                        }
                    }
                    
                    if ($match) break;
                }
                
if ($match) {
$csvArtist = '';
$csvAlbum = 'Inconnu';
$csvPath = Config::DIR_PLAYLISTS . $relativePath;
if (file_exists($csvPath)) {
try {
$handle = fopen($csvPath, 'r');
if ($handle !== false) {
fgetcsv($handle);
$firstRow = fgetcsv($handle);
fclose($handle);
if ($firstRow && count($firstRow) >= 4) {
$csvArtist = $firstRow[2] ?? '';
$csvAlbum = (count($firstRow) >= 5) ? trim($firstRow[4]) : 'Inconnu';
}
}
} catch (Exception $e) {
error_log('handleSearch result error: ' . $e->getMessage());
}
}

$results[] = [
'path' => $relativePath,
'filename' => $filename,
'folderPath' => $folderPath,
'artist' => $csvArtist,
'album' => $csvAlbum,
'style' => $parts[1] ?? '',
'modified' => $file->getMTime()
];
}
            }
        }
    } catch (Exception $e) {
        error_log('handleSearch error: ' . $e->getMessage());
    }
    
    usort($results, fn($a, $b) => $b['modified'] - $a['modified']);
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'files' => $results]);
}

// ============ RADIO ============
// Retourne N vidéos aléatoires depuis dossier(s) spécifié(s)

function handleRadio(): void {
    $count = isset($_GET['count']) ? (int)$_GET['count'] : 50;
    $folders = isset($_GET['folders']) ? explode(',', $_GET['folders']) : [];
    
    $count = max(1, min(500, $count));
    
    if (empty($folders)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'No folders']);
        return;
    }
    
    $allVideos = [];
    foreach ($folders as $folder) {
        $folder = trim($folder);
        if ($folder) {
            $allVideos = array_merge($allVideos, collectVideosFromFolder($folder));
        }
    }
    
    shuffle($allVideos);
    $videos = array_slice($allVideos, 0, $count);
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'videos' => $videos, 'count' => count($videos)]);
}

// ============ COLLECT VIDEOS FROM FOLDER ============
function collectVideosFromFolder(string $relativePath): array {
    $videos = [];
    $dir = Config::DIR_PLAYLISTS . $relativePath;
    
    if (!is_dir($dir)) {
        return $videos;
    }
    
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'csv') {
                $csvPath = $file->getPathname();
                try {
                    $handle = fopen($csvPath, 'r');
                    if ($handle !== false) {
                        fgetcsv($handle);
                        while (($row = fgetcsv($handle)) !== false) {
                            if (count($row) >= 4) {
                                $id = trim($row[0]);
                                if (!empty($id) && strtolower($id) !== 'id') {
$videos[] = [
'id' => $id,
'title' => trim($row[1]),
'artist' => trim($row[2]),
'song_title' => trim($row[3]),
'album' => (count($row) >= 5) ? trim($row[4]) : 'Inconnu'
];
                                }
                            }
                        }
                        fclose($handle);
                    }
                } catch (Exception $e) {
                    error_log('collectVideosFromFolder error: ' . $e->getMessage());
                }
            }
        }
    } catch (Exception $e) {
        error_log('collectVideosFromFolder iterator error: ' . $e->getMessage());
    }
    
    return $videos;
}

// ============ MAIN ============
// Point d'entrée API

$action = isset($_GET[Config::PARAM_ACTION])
    ? (string)$_GET[Config::PARAM_ACTION]
    : '';

header('Content-Type: application/json');
$allowedOrigins = [
  'https://milescorp.great-site.net',
  'http://localhost',
  'http://127.0.0.1'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: GET');
  header('Access-Control-Allow-Headers: Content-Type');
}

switch ($action) {
    case 'scan':
        handleScan();
        break;
    case 'scanRecursive':
        handleScanRecursive();
        break;
    case 'playlist':
        handlePlaylist();
        break;
    case 'recent':
        handleRecent();
        break;
    case 'search':
        handleSearch();
        break;
    case 'radio':
        handleRadio();
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => Config::MSG_ERROR_ACTION
        ]);
}

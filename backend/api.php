<?php
/**
 * API Backend - Playlist Mnemo
 * Gestion des playlists avec arborescence de dossiers
 */

// ============ CONFIGURATION ============
error_reporting(E_ALL);
ini_set('display_errors', 0); // Ne pas afficher les erreurs dans la réponse JSON
header('Content-Type: application/json; charset=utf-8');

// Récupération et validation de l'action
$action = $_GET['action'] ?? '';

// Réponse par défaut
$response = ['success' => false, 'data' => []];

// ============ FONCTIONS UTILITAIRES ============

/**
 * Sécurise un chemin pour éviter les attaques par traversal
 * @param string $path Chemin à sécuriser
 * @return string Chemin nettoyé
 */
function sanitizePath($path) {
    // Supprime les caractères dangereux et normalise
    $path = str_replace(['..', '\\'], ['', '/'], $path);
    $path = preg_replace('/[^a-zA-Z0-9\/_-]/', '', $path);
    return trim($path, '/');
}

/**
 * Scanne un dossier et retourne fichiers CSV et sous-dossiers
 * @param string $basePath Chemin de base (racine du projet)
 * @param string $relativePath Chemin relatif à explorer
 * @return array ['folders' => [], 'files' => []]
 */
function scanDirectory($basePath, $relativePath = '') {
    $result = ['folders' => [], 'files' => []];
    
    // Dossiers à exclure
    $exclude = ['vendor', 'node_modules', '.git', 'backend', 'frontend', 'assets', '__pycache__'];
    
    // Construire le chemin absolu
    $targetPath = $relativePath 
        ? rtrim($basePath, '/') . '/' . sanitizePath($relativePath)
        : rtrim($basePath, '/');
    
    if (!is_dir($targetPath)) {
        return $result;
    }
    
    $items = @scandir($targetPath);
    if ($items === false) {
        return $result;
    }
    
    foreach ($items as $item) {
        // Ignorer les entrées spéciales
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        // Ignorer les dossiers exclus
        if (in_array($item, $exclude)) {
            continue;
        }
        
        $fullPath = $targetPath . '/' . $item;
        
        if (is_dir($fullPath)) {
            $result['folders'][] = $item;
        } elseif (is_file($fullPath) && strtolower(pathinfo($item, PATHINFO_EXTENSION)) === 'csv') {
            $result['files'][] = $item;
        }
    }
    
    // Trier alphabétiquement
    sort($result['folders']);
    sort($result['files']);
    
    return $result;
}

/**
 * Charge et parse un fichier CSV
 * @param string $basePath Chemin de base
 * @param string $file Nom du fichier CSV
 * @param string $relativePath Chemin relatif du dossier
 * @return array Données vidéos
 */
function loadPlaylistFromCSV($basePath, $file, $relativePath) {
    $videos = [];
    
    // Construire le chemin complet
    $filePath = rtrim($basePath, '/') . '/' . sanitizePath($relativePath);
    if ($filePath !== '') {
        $filePath .= '/';
    }
    $filePath .= basename($file);
    
    if (!file_exists($filePath)) {
        return $videos;
    }
    
    $handle = fopen($filePath, 'r');
    if ($handle === false) {
        return $videos;
    }
    
    // Lire l'en-tête
    $header = fgetcsv($handle);
    if ($header === false) {
        fclose($handle);
        return $videos;
    }
    
    // Mapper les colonnes
    $columnMap = [];
    foreach ($header as $index => $colName) {
        $colNameLower = strtolower(trim($colName));
        if (strpos($colNameLower, 'youtube') !== false || strpos($colNameLower, 'video') !== false) {
            $columnMap['video_id'] = $index;
        } elseif (strpos($colNameLower, 'artist') !== false || strpos($colNameLower, 'interprète') !== false) {
            $columnMap['artist'] = $index;
        } elseif (strpos($colNameLower, 'title') !== false || strpos($colNameLower, 'song') !== false || strpos($colNameLower, 'titre') !== false) {
            $columnMap['title'] = $index;
        } elseif (strpos($colNameLower, 'album') !== false) {
            $columnMap['album'] = $index;
        }
    }
    
    // Lire les données
    while (($row = fgetcsv($handle)) !== false) {
        $video = [
            'id' => isset($columnMap['video_id']) && isset($row[$columnMap['video_id']]) 
                ? extractVideoId($row[$columnMap['video_id']]) 
                : '',
            'artist' => isset($columnMap['artist']) && isset($row[$columnMap['artist']]) 
                ? trim($row[$columnMap['artist']]) 
                : '',
            'song_title' => isset($columnMap['title']) && isset($row[$columnMap['title']]) 
                ? trim($row[$columnMap['title']]) 
                : '',
            'album' => isset($columnMap['album']) && isset($row[$columnMap['album']]) 
                ? trim($row[$columnMap['album']]) 
                : pathinfo($file, PATHINFO_FILENAME),
            'sourceFile' => $file,
            'sourcePath' => $relativePath
        ];
        
        if (!empty($video['id'])) {
            $videos[] = $video;
        }
    }
    
    fclose($handle);
    return $videos;
}

/**
 * Extrait l'ID YouTube d'une URL ou retourne l'ID brut
 * @param string $input URL ou ID YouTube
 * @return string|null ID YouTube ou null si invalide
 */
function extractVideoId($input) {
    $input = trim($input);
    
    // Si c'est déjà un ID (11 caractères alphanumériques)
    if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $input)) {
        return $input;
    }
    
    // Patterns d'URL YouTube
    $patterns = [
        '/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/',
        '/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/',
        '/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/'
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $input, $matches)) {
            return $matches[1];
        }
    }
    
    return null;
}

// ============ TRAITEMENT DES ACTIONS ============

try {
    // Chemin de base : dossier storage/playlists
    $basePath = dirname(__DIR__) . '/storage/playlists';
    
    // Vérifier que le dossier existe, sinon le créer
    if (!is_dir($basePath)) {
        @mkdir($basePath, 0755, true);
    }
    
    if ($action === 'scan') {
        // Scan d'un dossier - retourne folders[] et files[]
        $relativePath = $_GET['path'] ?? '';
        $relativePath = sanitizePath($relativePath);
        
        $scanResult = scanDirectory($basePath, $relativePath);
        
        $response = [
            'success' => true,
            'currentPath' => $relativePath,
            'folders' => $scanResult['folders'],
            'files' => $scanResult['files']
        ];
        
    } elseif ($action === 'playlist') {
        // Charger une playlist depuis un fichier CSV
        $file = $_GET['file'] ?? '';
        $path = $_GET['path'] ?? '';
        
        if (empty($file)) {
            throw new Exception('Paramètre "file" requis');
        }
        
        $videos = loadPlaylistFromCSV($basePath, $file, $path);
        
        $response = [
            'success' => true,
            'file' => $file,
            'path' => $path,
            'count' => count($videos),
            'videos' => $videos
        ];
        
    } elseif ($action === 'recent') {
        // Retourner les derniers fichiers CSV modifiés
        $limit = min((int)($_GET['limit'] ?? 20), 50);
        
        $allFiles = [];
        
        // Fonction récursive pour trouver tous les CSV
        $findCsvFiles = function($dir, $relPath) use (&$findCsvFiles, &$allFiles, $basePath) {
            $result = scanDirectory($basePath, $relPath);
            
            foreach ($result['files'] as $file) {
                $fullPath = rtrim($basePath, '/') . '/' . sanitizePath($relPath);
                if ($fullPath !== '') {
                    $fullPath .= '/';
                }
                $fullPath .= $file;
                
                if (file_exists($fullPath)) {
                    $allFiles[] = [
                        'file' => $file,
                        'path' => $relPath,
                        'mtime' => filemtime($fullPath)
                    ];
                }
            }
            
            foreach ($result['folders'] as $folder) {
                $newRelPath = $relPath ? $relPath . '/' . $folder : $folder;
                $findCsvFiles($basePath, $newRelPath);
            }
        };
        
        $findCsvFiles($basePath, '');
        
        // Trier par date de modification décroissante
        usort($allFiles, function($a, $b) {
            return $b['mtime'] - $a['mtime'];
        });
        
        // Limiter le résultat
        $recentFiles = array_slice($allFiles, 0, $limit);
        
        $response = [
            'success' => true,
            'count' => count($recentFiles),
            'files' => $recentFiles
        ];
        
    } elseif ($action === 'search') {
        // Recherche dans tous les fichiers CSV
        $query = $_GET['q'] ?? '';
        $fields = $_GET['fields'] ?? 'artist,title,album';
        
        if (strlen($query) < 3) {
            $response = [
                'success' => true,
                'query' => $query,
                'results' => [],
                'message' => 'Termes de recherche trop courts (minimum 3 caractères)'
            ];
        } else {
            $searchFields = array_map('trim', explode(',', $fields));
            $results = [];
            
            // Fonction de recherche
            $searchInFile = function($file, $path) use ($basePath, $query, $searchFields, &$results) {
                $videos = loadPlaylistFromCSV($basePath, $file, $path);
                
                foreach ($videos as $video) {
                    $match = false;
                    
                    if (in_array('artist', $searchFields) && stripos($video['artist'], $query) !== false) {
                        $match = true;
                    }
                    if (in_array('title', $searchFields) && stripos($video['song_title'], $query) !== false) {
                        $match = true;
                    }
                    if (in_array('album', $searchFields) && stripos($video['album'], $query) !== false) {
                        $match = true;
                    }
                    
                    if ($match) {
                        $results[] = $video;
                    }
                }
            };
            
            // Parcourir tous les fichiers
            $scanAll = function($relPath) use (&$scanAll, $basePath, $searchInFile) {
                $result = scanDirectory($basePath, $relPath);
                
                foreach ($result['files'] as $file) {
                    $searchInFile($file, $relPath);
                }
                
                foreach ($result['folders'] as $folder) {
                    $newRelPath = $relPath ? $relPath . '/' . $folder : $folder;
                    $scanAll($newRelPath);
                }
            };
            
            $scanAll('');
            
            // Limiter à 100 résultats
            $results = array_slice($results, 0, 100);
            
            $response = [
                'success' => true,
                'query' => $query,
                'fields' => $searchFields,
                'count' => count($results),
                'results' => $results
            ];
        }
        
    } elseif ($action === 'scanRecursive') {
        // Scan récursif complet pour l'expansion totale
        $depth = (int)($_GET['depth'] ?? 10);
        
        $buildTree = function($relPath, $currentDepth) use (&$buildTree, $basePath) {
            if ($currentDepth > $depth) {
                return null;
            }
            
            $result = scanDirectory($basePath, $relPath);
            $tree = [
                'folders' => [],
                'files' => $result['files']
            ];
            
            foreach ($result['folders'] as $folder) {
                $newRelPath = $relPath ? $relPath . '/' . $folder : $folder;
                $childTree = $buildTree($newRelPath, $currentDepth + 1);
                if ($childTree && (count($childTree['folders']) > 0 || count($childTree['files']) > 0)) {
                    $tree['folders'][$folder] = $childTree;
                }
            }
            
            return $tree;
        };
        
        $tree = $buildTree('', 0);
        
        $response = [
            'success' => true,
            'tree' => $tree
        ];
        
    } elseif ($action === 'radio') {
        // Générer une playlist aléatoire
        $count = min((int)($_GET['count'] ?? 10), 100);
        $folders = $_GET['folders'] ?? '';
        
        $allVideos = [];
        
        if (!empty($folders)) {
            $folderList = array_map('trim', explode(',', $folders));
            
            foreach ($folderList as $folder) {
                $scanResult = scanDirectory($basePath, $folder);
                
                foreach ($scanResult['files'] as $file) {
                    $videos = loadPlaylistFromCSV($basePath, $file, $folder);
                    $allVideos = array_merge($allVideos, $videos);
                }
            }
        } else {
            // Tous les dossiers
            $scanAll = function($relPath) use (&$scanAll, $basePath, &$allVideos) {
                $result = scanDirectory($basePath, $relPath);
                
                foreach ($result['files'] as $file) {
                    $videos = loadPlaylistFromCSV($basePath, $file, $relPath);
                    $allVideos = array_merge($allVideos, $videos);
                }
                
                foreach ($result['folders'] as $folder) {
                    $newRelPath = $relPath ? $relPath . '/' . $folder : $folder;
                    $scanAll($newRelPath);
                }
            };
            
            $scanAll('');
        }
        
        // Mélanger et sélectionner
        shuffle($allVideos);
        $selected = array_slice($allVideos, 0, $count);
        
        $response = [
            'success' => true,
            'count' => count($selected),
            'videos' => $selected
        ];
        
    } else {
        $response = [
            'success' => false,
            'error' => 'Action inconnue: ' . htmlspecialchars($action),
            'available_actions' => ['scan', 'playlist', 'recent', 'search', 'scanRecursive', 'radio']
        ];
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => 'Erreur: ' . $e->getMessage()
    ];
}

echo json_encode($response);

<?php
/**
 * API Backend - Playlist Mnemo
 * Version simplifiée pour InfinityFree
 */

// Configuration minimale
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

// Récupération de l'action
$action = $_GET['action'] ?? '';

// Réponse par défaut
$response = ['success' => false, 'data' => []];

try {
    if ($action === 'scan') {
        // Scan simple - retourne les dossiers à la racine
        $exclude = ['vendor', 'node_modules', '.git', 'storage', 'backend', 'frontend', 'assets'];
        $items = [];
        
        // Utiliser le chemin relatif sécurisé
        $rootPath = '..';
        
        if (is_dir($rootPath)) {
            $files = @scandir($rootPath);
            if ($files !== false) {
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..' || in_array($file, $exclude)) continue;
                    
                    $path = $rootPath . '/' . $file;
                    if (@is_dir($path)) {
                        $items[] = [
                            'name' => $file,
                            'path' => $file,
                            'type' => 'folder',
                            'children' => []
                        ];
                    }
                }
            }
        }
        
        $response = ['success' => true, 'data' => $items];
        
    } elseif ($action === 'recent') {
        // Retourne un tableau vide pour les récents
        $response = ['success' => true, 'data' => []];
        
    } elseif ($action === 'playlist') {
        // Gestion basique des playlists
        $response = ['success' => true, 'data' => []];
        
    } elseif ($action === 'search') {
        // Recherche basique
        $response = ['success' => true, 'data' => []];
        
    } elseif ($action === 'scanRecursive') {
        // Scan récursif simplifié
        $response = ['success' => true, 'data' => []];
        
    } elseif ($action === 'scrap') {
        // Scrap
        $response = ['success' => true, 'data' => []];
        
    } else {
        $response = ['success' => false, 'error' => 'Action inconnue: ' . htmlspecialchars($action)];
    }
    
} catch (Exception $e) {
    $response = ['success' => false, 'error' => 'Erreur: ' . $e->getMessage()];
}

echo json_encode($response);

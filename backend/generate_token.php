<?php

declare(strict_types=1);

// ============ HEADERS CORS (AVANT TOUT) ============
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
    
    // Essayer de reconstruire l'origine depuis le host
    if (!empty($host)) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $origin = $scheme . '://' . $host;
    } elseif (!empty($referer)) {
        // Extraire l'origine depuis le referer
        $originParts = parse_url($referer);
        if ($originParts && isset($originParts['scheme']) && isset($originParts['host'])) {
            $origin = $originParts['scheme'] . '://' . $originParts['host'];
            if (isset($originParts['port'])) {
                $origin .= ':' . $originParts['port'];
            }
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

// En production, on peut aussi accepter les requêtes sans origine (same-origin)
if (!$isAllowed && !empty($origin)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Origine non autorisée: ' . $origin]);
    exit;
}

// Si pas d'origine détectée mais pas en production stricte, on continue
if (empty($origin)) {
    $origin = $allowedOrigins[0]; // Utiliser la première origine par défaut
}

header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// ============ GÉNÉRATION TOKEN CSRF ============

session_start();

// Générer un nouveau token s'il n'existe pas ou s'il est expiré
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

echo json_encode([
    'success' => true,
    'token' => $_SESSION['csrf_token']
]);

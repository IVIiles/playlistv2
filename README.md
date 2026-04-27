---
title: "README Playlist MNEMO"
version: 2.8
priority: NORMAL
---

# Playlist MNEMO

## Description

Lecteur de playlists YouTube avec navigation arborescente interactive. Architecture moderne séparant frontend et backend, refactorisée en modules ES par composants fonctionnels. Design cyberpunk sombre unifié.

## Structure

playlist/
├── assets/
│ └── favicon.ico # Favicon navigateur + bouton retour
├── docs/
│ └── MAJ_COLONNE_ALBUM.md # Documentation migration colonne album
├── index.html # Page principale (charge app.js en module)
├── constants/
│ ├── labels_playlist.js # Labels UI (français) – variable globale
│ └── icons_playlist.js # Icônes – variable globale
├── storage/
│ └── playlists/ # Fichiers CSV
├── frontend/
│ ├── css/
│ │ └── style.css # Styles isolés (#playlist-app)
│ └── js/
│ ├── app.js # Orchestrateur (point d'entrée module)
│ ├── utils.js # Utilitaires génériques (ES module)
│ ├── api.js # Service d'appels API (ES module)
│ ├── core/
│ │ ├── player.js # Lecteur YouTube (ES module)
│ │ └── playlist.js # Gestion des listes de lecture (ES module)
│ ├── components/
│ │ ├── tree.js # Arborescence
│ │ ├── playlist-ui.js # Affichage et contrôle de la playlist
│ │ ├── radio.js # Fonctionnalité Radio
│ │ ├── scrapper.js # Fonctionnalité Scrapper
│ │ ├── search.js # Recherche globale
│ │ └── recent.js # Nouveautés
│ └── ui/
│ ├── notifications.js # Gestion dynamique des toasts
│ └── layout.js # Toggle sidebars
├── backend/
│ ├── api.php # API JSON principale
│ ├── api_yt.php # Clé API YouTube (secret)
│ └── scrapper.php # API scraping YouTube avec détection métadonnées
text


## Layout

| Zone | Position | Largeur | Description |
|------|----------|---------|-------------|
| Header | Haut | 60px | Favicon + boutons toggle + titre + options |
| Navigation | Gauche | 300px | Arborescence dossiers |
| Player | Centre | Flex | Lecteur YouTube + titre vidéo |
| Playlist | Droite | 250px | Liste titres + recherche |

> **Note** : `#playlist-app` est le conteneur root avec layout flex.

## API Backend

| Endpoint | Paramètres | Description |
|----------|------------|-------------|
| `?action=scan` | `path=` | Liste dossiers et fichiers CSV |
| `?action=playlist` | `file=` `path=` | Retourne données vidéos |
| `?action=recent` | - | Retourne les 20 derniers fichiers CSV triés par date modification |
| `?action=search` | `q=` `fields=` | Recherche dans les fichiers CSV (artist, album, title) - recherche mot entier |
| `?action=scrape` | `url=` | Scrape playlist YouTube → retourne CSV |
| `?action=radio` | `count=` `folders=` | Retourne N vidéos aléatoires depuis dossier(s) |

### Notes sur la recherche

- **Recherche partielle** : La recherche utilise `stripos()` pour trouver les correspondances partielles (ex: "doe" trouve "Doechii")
- **Trigger** : Minimum 3 caractères requis pour lancer la recherche
- **Options** :
  - `artist` : Colonne artist du CSV (index 2)
  - `album` : Nom du fichier CSV
  - `title` : Colonne song_title du CSV (index 3)

### URL de navigation

| Paramètre | Description |
|-----------|-------------|
| `path=` | Chemin du dossier (arborescence) |
| `file=` | Fichier CSV à charger |
| `csvPath=` | Chemin du CSV (pour garder l'arborescence visible) |

### Réponses JSON

**scan**:
```json
{
  "success": true,
  "currentPath": "albums complets/Pop",
  "folders": ["Michael Jackson", "Tones and I"],
  "files": ["Tones and I - The Kids Are Coming.csv"]
}

playlist:
json

{
  "success": true,
  "currentPath": "albums complets/Pop",
  "selectedFile": "Tones and I - The Kids Are Coming.csv",
  "videos": [
    {"id": "buWA_xsT_Is", "title": "...", "artist": "...", "song_title": "..."}
  ],
  "hasVideos": true
}

recent:
json

{
  "success": true,
  "files": [
    {"path": "albums complets/Hip-Hop/01-Francais/Suprême NTM/Suprême NTM - Intro (Audio).csv", "filename": "Suprême NTM - Intro (Audio).csv", "modified": 1699999999, "style": "Hip-Hop", "folderPath": "albums complets/Hip-Hop/01-Francais/Suprême NTM", "artist": "Suprême NTM", "album": "Suprême NTM - Intro (Audio)"}
  ]
}

search:
json

{
  "success": true,
  "files": [
    {"path": "albums complets/Hip-Hop/01-Francais/Suprême NTM/Suprême NTM - Intro (Audio).csv", "filename": "Suprême NTM - Intro (Audio).csv", "folderPath": "albums complets/Hip-Hop/01-Francais/Suprême NTM", "artist": "Suprême NTM", "album": "Suprême NTM - Intro (Audio)", "style": "Hip-Hop", "modified": 1699999999}
  ]
}

scrape:
json

{
  "success": true,
  "count": 42,
  "csv": "id,title,artist,song_title,album\\n...",
  "detectedArtist": "Red Hot Chili Peppers",
  "detectedAlbum": "Stadium Arcadium",
  "suggestedFilename": "Red Hot Chili Peppers - Stadium Arcadium.csv",
  "confidence": 93
}

    Nouveauté v2.4 : Le scrapper détecte automatiquement l'artiste dominant (algorithme de vote majoritaire) et suggère un nom de fichier au format "Artiste - Album.csv".

radio:
json

{
  "success": true,
  "videos": [
    {"id": "buWA_xsT_Is", "title": "...", "artist": "...", "song_title": "..."}
  ],
  "count": 50
}

Format CSV
Format attendu (5 colonnes)
csv

id,title,artist,song_title,album
"buWA_xsT_Is","TONES AND I...","TONES AND I","THE KIDS ARE COMING...","The Kids Are Coming"

    Rétro-compatibilité : Les fichiers CSV avec 4 colonnes (sans album) sont toujours supportés. La valeur "Inconnu" est utilisée par défaut.

Installation

    Servir via PHP (recommandé):
    bash

    php -S localhost:8000

    Puis ouvrir http://localhost:8000

    Ou serveur web:

        Apache/Nginx avec PHP 7.4+

        Pointer Document Root vers le dossier

Configuration API YouTube

Pour utiliser le scrapper, vous devez configurer votre clé API YouTube :

    Créer un projet dans Google Cloud Console

    Activer l'API YouTube Data API v3

    Créer des credentials (API Key)

    Éditer le fichier backend/api_yt.php :
    php

    <?php
    return 'VOTRE_CLE_API_YT';
    ?>

    Note : La clé API est secrète et ne doit pas être commitée.

Fonctionnalités
Fonctionnalité	Description
Arborescence	Navigation tree view interactive dossiers/sous-dossiers
Tout déplier/replier	Boutons pour expand/collapse global (2 niveaux)
Recherche	Filtrage titres par artiste/titre/album (recherche partielle)
Shuffle	Mode aléatoire avec conservation des ajouts
Ajout par clic droit	Clic droit sur un fichier CSV pour l'ajouter à la playlist actuelle (fermeture auto hors menu)
Drag & Drop	Réordonner les titres
YouTube Player	Intégration API IFrame
Contrôles	Prev/Next/Pause/Restart
Affichage titre vidéo	Artiste, titre et album de la vidéo en cours dans le player
Responsive	Support mobile
Favicon	favicon.ico pour l'onglet navigateur et le bouton retour
Labels dynamiques	UI multilingue prête
Notifications toast	Design cyberpunk : succès auto 3s (cyan), erreur avec bouton X (rouge)
Toast actions lecteur	Notifications toast lors des clics prev/next/restart/play-pause/shuffle
Header	Boutons toggle + retour + titre + options
Toggle sidebars	Masquer/afficher navigation et playlist depuis le header
Navigation SPA	AJAX sans reload (history.pushState), URLs shareables
Expand auto	L'arborescence se déploie automatiquement depuis les modales
Skip unavailable	Ignorer automatiquement les vidéos bloquées (pays, supprimées) pendant la lecture
Modale Nouveautés	Affichage grid des 20 derniers fichiers CSV
Modale Rechercher	Recherche avec options (artist, album, title) + trigger 3 lettres
Modale Scrapper	Extraction playlist YouTube vers CSV avec détection automatique artiste/album, suggestion nom de fichier, et téléchargement direct
Modale Radio	Génère playlist aléatoire (X titres depuis Y genres). Interface : zone de contrôle (nombre + bouton) puis messages puis sélection des genres
Toggle unifié	Clic sur ▶ ou dossier = même action (expand + toggle)
Toggle inversé	Ordre boutons [Navigation] [Playlist]
Performance

    Event Delegation: Un seul listener pour toute l'arborescence

    Lazy Loading: Chargement des sous-dossiers à la demande

    Promise.all: Chargement parallèle des dossiers

    CSS optimisé: Regroupement sélecteurs search/clear buttons

    History API: URLs shareables sans reload page

    Scrollbars personnalisées: Style cyan (WebKit + Firefox)

    Hover uniformisés: Boutons player/shuffle avec transform + box-shadow

    Chargement parallèle: Les fichiers CSV d’un dossier sont chargés simultanément (Promise.all)

    Architecture modulaire: Modules ES chargés à la demande, pas de bloc monolithique

Sécurité

    PathSanitizer: Protection directory traversal + validation realpath() avec isPathSafe()

    Liens symboliques: Bloqués via isPathSafe() qui vérifie que le realpath() reste dans storage/playlists/

    Chemins absolus: Rejetés dans PathSanitizer::clean()

    XSS: Échappement via escapeHtml()

    Fetch: Vérification response.ok + try/catch

    CORS: Whitelist stricte (domain autorisé + localhost)

    API: Vérification data.success avant traitement

    Null checks: Protection valeurs nulles

    Guard null: showNotification() protège contre les msg undefined/null

    Validation clé API: Regex format AIza[0-9A-Za-z_-]{35} avant utilisation (scrapper.php)

    Fichier config: Vérification existence api_yt.php avant inclusion

    MetadataDetector: Classe utilitaire pour validation et nettoyage des métadonnées

    Timeout réseau: 10 secondes max sur appels API YouTube (anti-blocage)

    JSON validation: json_last_error() vérifié avant parsing des réponses API

    Notification typée: Paramètre de type explicite ('success' / 'error') pour les toasts

    Nom de fichier sécurisé: basename() appliqué côté client pour le téléchargement de CSV

Conventions
Règle	Application
Langue	Français (variables, commentaires)
Sections JS	// ============ NOM ============
Sections HTML	<!-- ============ NOM ============ --> + mini-resumé
Sections CSS	/* ============ NOM ============ */
Mini-resumés	Sur toutes les functions
Scrollbars	WebKit + Firefox, thème cyan
Documentation	PHPDoc sur les fonctions PHP, JSDoc sur les méthodes JavaScript
Changelog
v2.8 (2026-04-26)

    UI Radio : Réorganisation de la modale Radio : zone de contrôle (nombre + bouton) en haut, puis messages, puis sélection des dossiers.

    Toasts : Refonte complète du design des notifications (style cyberpunk arrondi, bordures colorées, flou). Les toasts sont désormais créés dynamiquement dans #playlist-app. Correction de l'affichage des couleurs.

    Titre vidéo : Réintégration de l'affichage du titre, artiste et album dans le player.

    Variables CSS : Ajout de --success-color et --danger-color pour personnaliser les couleurs des toasts.

    CSS : Nettoyage des doublons, correction des scrollbars.

v2.7 (2026-04-26)

    Refactorisation modulaire : Découpage de l'application en modules ES organisés par composants fonctionnels (arborescence, playlist, radio, scrapper, recherche, nouveautés) + services cœur (player, playlist) + utilitaires (utils, api, notifications, layout). app.js devient un simple orchestrateur.

    Chargement module : index.html charge désormais app.js avec type="module".

    Communication : Les composants communiquent via des événements personnalisés et un objet services partagé.

    Documentation : Ajout de la nouvelle structure dans le README.

v2.6 (2026-04-26)

    Sécurité : Validation renforcée des chemins avec isPathSafe() (blocage des liens symboliques et des chemins absolus). Suppression de getSafeDir.

    Robustesse : Dédoublonnage des vidéos dans la radio, showNotification avec type explicite, basename sur les noms de fichiers téléchargés.

    Performance : Parallélisation du chargement des CSV dans addFolderToPlaylist (Promise.all).

    Documentation : Ajout de blocs PHPDoc / JSDoc sur toutes les fonctions métier.

    Nettoyage : Unification du listener contextmenu, suppression du script performance_monitor.js inutilisé.

v2.5 (2026-04-16)

    Timeout API YouTube : file_get_contents avec timeout 10s dans scrapePlaylist et fetchPlaylistTitle

    Validation JSON : Check json_last_error() explicite avec message d'erreur clair

v2.4 (2026-04-14)

    Scrapper amélioré : Détection automatique de l'artiste dominant (algorithme de vote majoritaire : ≥2 occurrences)

    Nom de fichier suggéré : Format "Artiste - Album.csv" généré automatiquement

    Colonne album : Support 5 colonnes CSV (id, title, artist, song_title, album)

    Validation clé API : Regex AIza[0-9A-Za-z_-]{35} avant utilisation

    Classe MetadataDetector : Extraction métadonnées via API YouTube /playlists

    Notification succès : Toast vert lors de la détection artiste

v2.3 (précédente)

    Architecture frontend/backend séparée

    Support colonnes album (rétro-compatible)

    Modales Nouveautés/Rechercher/Scrapper/Radio

    Notifications toast

    Drag & Drop playlist

    Responsive design

Dépendances

    PHP 7.4+

    YouTube IFrame API (inclus)

    Aucun framework externe

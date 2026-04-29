# PlaylistV2

Application web de lecteur de playlists YouTube avec gestion d'arborescence de fichiers CSV.

---

## 📋 Vue d'ensemble

**PlaylistV2** est une application web permettant de lire des playlists musicales issues de YouTube, organisées sous forme de fichiers CSV dans une arborescence de dossiers. Elle offre des fonctionnalités avancées comme le scraping de playlists YouTube, la génération de radio aléatoire, et la recherche multi-critères.

| Caractéristique | Valeur |
|-----------------|--------|
| **Version** | 2.0 |
| **Date** | 28 avril 2026 |
| **Architecture** | SPA (Single Page Application) |
| **Pattern** | Modularité avec composants |

---

## 🏗️ Architecture Générale

### Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | JavaScript ES6+ (modules ES), CSS3, HTML5 |
| Backend | PHP 7.4+ (strict_types) |
| API Externe | YouTube Data API v3, YouTube IFrame Player API |
| Stockage | Fichiers CSV |
| Communication | EventTarget personnalisé entre composants |

---

## 📁 Structure du Projet

```
playlistv2/
├── index.html                 # Point d'entrée unique
├── assets/
│   └── favicon.ico           # Icône du site
├── backend/
│   ├── api.php               # API REST principale
│   ├── scrapper.php          # Scraper YouTube vers CSV
│   ├── generate_token.php    # ⭐ NOUVEAU : Endpoint génération token CSRF
│   └── api_yt.php            # Configuration clé API
├── constants/
│   ├── labels_playlist.js    # Internationalisation / textes (126 entrées)
│   └── icons_playlist.js     # Icônes Unicode (10 icônes)
├── frontend/
│   ├── css/
│   │   ├── style.css         # Styles principaux (1107 lignes)
│   │   └── style - Copie.css # Copie de sauvegarde
│   └── js/
│       ├── app.js            # Orchestrateur principal
│       ├── api.js            # Service API frontend
│       ├── utils.js          # Utilitaires (escapeHtml, debounce)
│       ├── pulse_logo.js     # Animation du logo
│       ├── components/       # Composants UI
│       │   ├── playlist-ui.js
│       │   ├── tree.js       # Navigation arborescente
│       │   ├── recent.js     # Modale nouveautés
│       │   ├── search.js     # Modale recherche
│       │   ├── scrapper.js   # Modale scrapper
│       │   └── radio.js      # Modale radio
│       ├── core/             # Logique métier
│       │   ├── player.js     # Lecteur YouTube
│       │   └── playlist.js   # Gestion playlist
│       └── ui/
│           ├── layout.js     # Gestion sidebars
│           └── notifications.js
└── storage/playlists/        # Données CSV (non versionné)
```

---

## ⚙️ Fonctionnalités

### 🎵 Lecteur YouTube
- Intégration via YouTube IFrame API
- Contrôles personnalisés : lecture/pause, précédent/suivant, redémarrage
- Gestion des états : lecture, pause, fin de vidéo, vidéo indisponible
- Affichage dynamique des métadonnées (artiste, titre, album)

### 🗂️ Navigation Arborescente
- Scan récursif du dossier `storage/playlists/`
- Expansion et réduction des dossiers
- Filtrage automatique des fichiers `.csv`
- Fil d'Ariane (breadcrumbs) de navigation
- Menu contextuel au clic droit (ajout fichier/dossier à la playlist)

### 📋 Gestion des Playlists
- Chargement depuis fichiers CSV
- Format CSV standardisé
- Glisser-déposer pour réordonner les titres
- Mode aléatoire (algorithme Fisher-Yates)
- Recherche locale avec filtrage temps réel

### 🔗 Scrapper YouTube
- Extraction d'une playlist via son URL
- Parsing automatique des titres (format "Artiste - Titre")
- Détection intelligente de l'artiste dominant (algorithme de vote majoritaire)
- Génération automatique de fichier CSV avec BOM UTF-8

### 📻 Radio
- Sélection aléatoire de N titres (configurable de 1 à 500)
- Sélection par dossiers sources
- Génération de playlist temporaire

### 🔍 Recherche Globale
- Recherche multi-critères : artiste, album, titre
- Scan de l'ensemble des fichiers CSV
- Affichage des résultats avec métadonnées extraites

### 🆕 Nouveautés
- Liste des 20 derniers fichiers modifiés
- Affichage par style (dossier parent)
- Cartes interactives avec métadonnées

---

## 🔌 API Backend

### Points d'entrée principaux (`api.php`)

| Action | Méthode | Paramètres | Description |
|--------|---------|------------|-------------|
| `scan` | GET | `path` | Liste le contenu d'un répertoire |
| `scanRecursive` | GET | `depth` (défaut: 4) | Retourne l'arborescence complète |
| `playlist` | GET | `path`, `file` | Charge les données d'un fichier CSV |
| `recent` | GET | - | Liste les 20 derniers fichiers modifiés |
| `search` | GET | `q`, `fields` | Recherche dans les fichiers CSV |
| `radio` | GET | `count`, `folders` | Retourne des vidéos aléatoires |

### Scrapper (`scrapper.php`)

| Action | Méthode | Paramètres | Description |
|--------|---------|------------|-------------|
| `scrape` | GET/POST | `url` | Extrait une playlist YouTube et génère un CSV |

### CSRF Token (`generate_token.php`)

| Action | Méthode | Paramètres | Description |
|--------|---------|------------|-------------|
| - | GET | - | Génère un token CSRF et le retourne au format JSON |

---

## 📊 Format des Données

### Structure CSV

```csv
id,title,artist,song_title,album
dQw4w9WgXcQ,Rick Astley - Never Gonna Give You Up,Rick Astley,Never Gonna Give You Up,Playlist Importée
```

**Colonnes :**
- `id` : Identifiant YouTube de la vidéo
- `title` : Titre brut YouTube
- `artist` : Nom de l'artiste extrait
- `song_title` : Titre de la chanson extrait
- `album` : Nom de l'album (ou "Playlist Importée")

### Réponse API Standard

```json
{
  "success": true,
  "data": {...},
  "error": "message d'erreur"
}
```

---

## 🚀 Configuration Requise

### PHP
- Version 7.4 ou supérieure
- Extensions requises : standard, SPL
- Permissions lecture/écriture sur le dossier `storage/playlists/`

### YouTube API
- Clé API YouTube Data v3 requise
- Format valide : `AIza...{35}`
- Quota API à surveiller pour le scrapper

### Navigateur
- Support des modules ES6
- Connexion Internet requise (API YouTube)
- JavaScript activé

### CORS Dynamique

Les fichiers PHP détectent automatiquement l'origine de la requête via plusieurs méthodes (dans l'ordre) :

1. **`HTTP_ORIGIN`** — Header standard (navigateurs modernes)
2. **`HTTP_HOST`** + **`HTTPS`** — Reconstruction de l'origine depuis le host
3. **`HTTP_REFERER`** — Extraction de l'origine depuis le referer (dernier recours)

Si aucune origine n'est détectée, la première origine de la whitelist est utilisée par défaut. Cette approche garantie la compatibilité avec différentes configurations serveur et navigateurs.

---

## 🔒 Sécurité

### Mesures en place ✅

| Aspect | Implémentation |
|--------|----------------|
| Sanitisation des chemins | `PathSanitizer` avec `realpath()` |
| Validation clé API | Regex format `AIza...{35}` |
| Échappement HTML | `escapeHtml()` côté client |
| Vérification répertoire | `isFileAllowed()` avant lecture |
| CORS | Whitelist stricte avec détection multi-sources (`HTTP_ORIGIN`, `HTTP_HOST`, `HTTP_REFERER`) |
| CSRF | Token généré via `generate_token.php` et validé sur les requêtes POST/PUT/DELETE |
| Rate Limiting | 5 requêtes/minute par IP (scrapper) |
| Path Traversal | Protection dans `handleRadio()` avec validation `realpath()` |
| Validation playlistId | Regex `^[A-Za-z0-9_-]{10,}$` (protection SSRF) |
| Gestion erreurs | Codes HTTP appropriés + messages JSON structurés avec `errorCode` |

### Fonctionnement du CSRF

1. **Génération** : Le frontend récupère un token via `GET /backend/generate_token.php`
2. **Stockage** : Le token est stocké côté client (`window.csrfToken`)
3. **Transmission** : Le token est envoyé dans le header `X-CSRF-Token` pour chaque requête POST/PUT/DELETE
4. **Validation** : Le backend vérifie le token avec `hash_equals()` pour prévenir les attaques CSRF

### Points de vigilance

- La clé API (`backend/api_yt.php`) doit être externalisée dans une variable d'environnement en production
- Adapter les seuils de rate limiting (5 req/min) selon l'usage réel
- Les headers CORS sont définis en début de fichier PHP pour éviter "headers already sent"
- Certains navigateurs/serveurs peuvent ne pas envoyer `HTTP_ORIGIN` — le code détecte automatiquement depuis `HTTP_HOST` ou `HTTP_REFERER`

---

## 📱 Flux d'utilisation typique

1. **Lancement** : Chargement de `index.html` → Initialisation de l'application
2. **Navigation** : Scan de l'arborescence → Sélection d'une playlist CSV
3. **Lecture** : Chargement des vidéos → Lecture de la première vidéo
4. **Contrôles** : Lecture/pause, navigation entre titres, mode aléatoire
5. **Import** : Utilisation du scrapper avec une URL YouTube → Génération CSV
6. **Découverte** : Utilisation de la radio aléatoire ou de la recherche globale

---

## 🛠️ Détails techniques

### Frontend
- **Architecture** : Classes ES6 avec séparation core/components/ui
- **Modules** : Import/export ES6, pas de bundler externe
- **Styles** : CSS vanilla avec variables CSS personnalisées (thème cyberpunk)
- **Responsive** : Breakpoint à 900px pour mobile

### Backend
- **Typage** : `declare(strict_types=1)` sur tous les fichiers
- **Classes** : Architecture orientée objet avec classes métier
- **Gestion des erreurs** : Try/catch sur les opérations fichiers, retours JSON structurés

### Constantes
- **Labels** : Centralisation des textes dans `labels_playlist.js`
- **Icônes** : Unicode emojis dans `icons_playlist.js`
- **Personnalisation** : Facilement modifiable sans toucher au code source

---

## 📝 Notes

Ce projet a été développé pour une utilisation personnelle de gestion de playlists musicales YouTube. Il nécessite une structure de dossiers spécifique dans `storage/playlists/` pour fonctionner correctement.

Pour toute question ou contribution, se référer au code source commenté.

---

*Dernière mise à jour : 28 avril 2026*

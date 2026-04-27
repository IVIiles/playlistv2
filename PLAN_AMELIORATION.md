# 🎯 PLAN D'AMÉLIORATION - PLAYLIST MNEMO v2.8

**Date :** Décembre 2024  
**Statut :** Phase de planification  
**Objectif :** Optimisation performance, cohérence architecturale et robustesse

---

## 📊 ÉTAT DES LIEUX

### Métriques du projet
- **Total lignes de code :** ~3 700 lignes
- **Modules JS :** 12 modules ES6
- **Fichiers PHP :** 3 endpoints API
- **Architecture :** Frontend/Backend découplé

### Structure actuelle
```
frontend/js/
├── app.js (566 lignes) ⚠️ Trop lourd
├── api.js (80 lignes) ✅ OK
├── utils.js (72 lignes) ✅ OK
├── pulse_logo.js (51 lignes)
├── core/
│   ├── player.js (181 lignes) ✅ OK
│   └── playlist.js (235 lignes) ✅ OK
├── components/ (6 composants, 236-418 lignes chacun) ⚠️ Variables
└── ui/ (2 modules, 26-78 lignes) ✅ OK
```

---

## 🚀 AXES D'AMÉLIORATION PRIORITAIRES

### 1. PERFORMANCE FRONTEND ⭐⭐⭐⭐⭐

#### 1.1 Optimisation du chargement initial
**Problème :** Tous les modules sont importés synchrone au démarrage
**Solution :** Lazy loading des composants non critiques

```javascript
// Actuel (app.js ligne 1-12)
import { ScrapperComponent } from './components/scrapper.js';
import { RadioComponent } from './components/radio.js';

// Proposé : Chargement différé
async function loadScrapper() {
    const { ScrapperComponent } = await import('./components/scrapper.js');
    return new ScrapperComponent({...});
}
```

**Gain estimé :** -30% sur le temps de chargement initial

#### 1.2 Mutualisation des appels API
**Problème :** Appels API répétitifs sans cache
**Solution :** Implémenter un cache in-memory avec TTL

```javascript
// Nouveau module : frontend/js/cache.js
export class CacheService {
    constructor(ttl = 300000) { // 5 minutes par défaut
        this.store = new Map();
        this.ttl = ttl;
    }
    
    async get(key, fetchFn) {
        const cached = this.store.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        const data = await fetchFn();
        this.store.set(key, { data, expiry: Date.now() + this.ttl });
        return data;
    }
    
    invalidate(pattern) {
        // Invalidation par pattern
    }
}
```

**Gain estimé :** -50% sur les requêtes réseau redondantes

#### 1.3 Debounce/throttle optimisé
**Problème :** Fonction debounce basique dans utils.js
**Solution :** Ajouter throttle + version cancelable

```javascript
// Enhancement utils.js
export function debounce(func, wait, options = {}) {
    let timeout;
    const { leading = false, trailing = true, cancelable = true } = options;
    
    const debounced = function(...args) {
        // ... implémentation améliorée
    };
    
    if (cancelable) {
        debounced.cancel = () => clearTimeout(timeout);
    }
    
    return debounced;
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
```

---

### 2. COHÉRENCE ARCHITECTURALE ⭐⭐⭐⭐⭐

#### 2.1 Standardisation des composants
**Problème :** Taille variable des composants (236 à 418 lignes)
**Solution :** Découpage en sous-composants

**Exemple pour tree.js (418 lignes) :**
```
components/
├── tree/
│   ├── index.js (export principal, 50 lignes)
│   ├── tree-builder.js (construction DOM, 150 lignes)
│   ├── tree-events.js (gestion événements, 120 lignes)
│   ├── tree-context-menu.js (menu contextuel, 100 lignes)
│   └── tree-utils.js (utilitaires, 50 lignes)
```

#### 2.2 Pattern Observer unifié
**Problème :** Mélange CustomEvent + callbacks
**Solution :** Standardiser sur CustomEvent partout

```javascript
// Actuel (incohérent)
this.notify(msg, type); // callback
this.dispatchEvent(new CustomEvent('select', detail)); // Event

// Proposé (unifié)
this.dispatchEvent(new CustomEvent('notify', { 
    detail: { message: msg, type } 
}));
```

#### 2.3 Gestion d'erreurs centralisée
**Problème :** try/catch dispersés, traitements hétérogènes
**Solution :** Créer un ErrorHandler global

```javascript
// Nouveau : frontend/js/core/error-handler.js
export class ErrorHandler {
    static handle(error, context = '') {
        console.error(`[Error ${context}]`, error);
        
        // Log centralisé (optionnel : envoyer à un service)
        this.logToService(error, context);
        
        // Notification utilisateur standardisée
        if (error.userVisible) {
            window.dispatchEvent(new CustomEvent('user-error', {
                detail: { message: error.userMessage }
            }));
        }
    }
    
    static wrap(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }
}
```

---

### 3. SÉCURITÉ RENFORCÉE ⭐⭐⭐⭐

#### 3.1 Validation des entrées API
**Actuel :** PathSanitizer fait le travail
**Amélioration :** Ajouter rate limiting + validation schema

```php
// backend/api.php - Enhancement
class RequestValidator {
    private const MAX_REQUESTS_PER_MINUTE = 60;
    private const MAX_PATH_LENGTH = 256;
    
    public static function validatePath(string $path): bool {
        if (strlen($path) > self::MAX_PATH_LENGTH) {
            return false;
        }
        // Rejet des caractères suspects
        if (preg_match('/[<>|;`$]/', $path)) {
            return false;
        }
        return true;
    }
    
    public static function rateLimit(string $ip): bool {
        // Implémentation avec Redis ou fichier
    }
}
```

#### 3.2 Content Security Policy
**Ajout dans index.html :**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://www.youtube.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' https://i.ytimg.com data:;">
```

#### 3.3 Protection CSRF
**Actuel :** Aucune protection
**Proposé :** Token CSRF pour les actions modifiantes

```php
// backend/api.php
session_start();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_error('CSRF token invalid');
        exit;
    }
}
```

---

### 4. QUALITÉ DU CODE ⭐⭐⭐⭐

#### 4.1 Typage JSDoc complet
**Problème :** Typage partiel
**Solution :** Ajouter JSDoc sur toutes les fonctions

```javascript
/**
 * Charge une vidéo dans le lecteur YouTube
 * @param {string} videoId - ID YouTube de la vidéo
 * @param {Object} [options] - Options de lecture
 * @param {number} [options.startAt=0] - Temps de départ en secondes
 * @param {boolean} [options.autoplay=true] - Lecture automatique
 * @returns {Promise<void>}
 * @throws {PlayerError} Si le lecteur n'est pas initialisé
 */
async loadVideoById(videoId, options = {}) {
    // ...
}
```

#### 4.2 Tests unitaires
**Actuel :** Aucun test
**Proposé :** Jest + Testing Library

```javascript
// tests/unit/playlist.test.js
import { Playlist } from '../../frontend/js/core/playlist.js';

describe('Playlist', () => {
    let playlist;
    
    beforeEach(() => {
        playlist = new Playlist();
    });
    
    test('nextIndex should cycle through tracks', () => {
        playlist.loadVideos([
            { id: '1' }, 
            { id: '2' }, 
            { id: '3' }
        ]);
        
        expect(playlist.currentIndex).toBe(0);
        playlist.nextIndex();
        expect(playlist.currentIndex).toBe(1);
        playlist.nextIndex();
        playlist.nextIndex();
        expect(playlist.currentIndex).toBe(0); // Cycle
    });
});
```

**Structure de tests proposée :**
```
tests/
├── unit/
│   ├── playlist.test.js
│   ├── player.test.js
│   └── utils.test.js
├── integration/
│   └── api-integration.test.js
└── e2e/
    └── navigation.spec.js (Playwright)
```

#### 4.3 Linting & Formatage
**Configuration ESLint + Prettier :**
```json
// .eslintrc.json
{
    "env": {
        "browser": true,
        "es2022": true
    },
    "extends": ["eslint:recommended"],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "prefer-const": "error",
        "no-var": "error"
    }
}
```

---

### 5. BACKEND OPTIMISÉ ⭐⭐⭐

#### 5.1 Pool de connexions fichiers
**Problème :** Ouverture/fermeture fichiers à chaque requête
**Solution :** Mettre en cache les descripteurs

```php
// backend/FilePool.php
class FilePool {
    private static $handles = [];
    
    public static function get(string $path): resource {
        if (!isset(self::$handles[$path])) {
            self::$handles[$path] = fopen($path, 'r');
        }
        return self::$handles[$path];
    }
    
    public static function close(string $path): void {
        if (isset(self::$handles[$path])) {
            fclose(self::$handles[$path]);
            unset(self::$handles[$path]);
        }
    }
}
```

#### 5.2 Compression Gzip
**Ajout dans api.php :**
```php
// Compression automatique si supportée
if (substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip')) {
    ob_start("ob_gzhandler");
} else {
    ob_start();
}
```

#### 5.3 Logging structuré
**Actuel :** error_log basique
**Proposé :** Logger JSON pour analyse

```php
// backend/Logger.php
class Logger {
    private const LOG_FILE = __DIR__ . '/../logs/app.log';
    
    public static function info(string $message, array $context = []): void {
        self::log('INFO', $message, $context);
    }
    
    public static function error(string $message, array $context = []): void {
        self::log('ERROR', $message, $context);
    }
    
    private static function log(string $level, string $message, array $context): void {
        $entry = [
            'timestamp' => date('c'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        file_put_contents(
            self::LOG_FILE, 
            json_encode($entry) . PHP_EOL, 
            FILE_APPEND
        );
    }
}
```

---

### 6. EXPÉRIENCE UTILISATEUR ⭐⭐⭐⭐

#### 6.1 Skeleton screens
**Actuel :** Loader texte unique
**Proposé :** Skeletons pour chaque section

```css
/* frontend/css/style.css */
.skeleton {
    background: linear-gradient(90deg, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

#### 6.2 Navigation clavier
**Actuel :** Navigation souris uniquement
**Proposé :** Raccourcis claviers

```javascript
// frontend/js/core/keyboard-navigation.js
export class KeyboardNavigation {
    constructor(player, playlist) {
        this.player = player;
        this.playlist = playlist;
        this.bindShortcuts();
    }
    
    bindShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.player.togglePlayPause();
                    break;
                case 'ArrowRight':
                    this.playlist.nextIndex();
                    break;
                case 'ArrowLeft':
                    this.playlist.prevIndex();
                    break;
                case 'KeyM':
                    this.player.toggleMute();
                    break;
                case 'KeyF':
                    this.player.toggleFullscreen();
                    break;
            }
        });
    }
}
```

#### 6.3 Offline mode (PWA)
**Proposé :** Service Worker pour cache statique

```javascript
// frontend/sw.js
const CACHE_NAME = 'mnemo-v2.8';
const ASSETS = [
    '/',
    '/index.html',
    '/frontend/css/style.css',
    '/frontend/js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => 
            response || fetch(event.request)
        )
    );
});
```

---

### 7. ACCESSIBILITÉ ⭐⭐⭐

#### 7.1 ARIA labels
**Actuel :** Labels partiels
**Proposé :** Couverture ARIA complète

```html
<!-- Améliorations index.html -->
<button id="shuffleBtn" 
        aria-label="Lecture aléatoire"
        aria-pressed="false">
    🔀
</button>

<div id="videoPlayer" 
     role="region" 
     aria-label="Lecteur vidéo">
</div>
```

#### 7.2 Focus management
**Proposé :** Gestion du focus pour navigation clavier

```javascript
// frontend/js/ui/focus-manager.js
export class FocusManager {
    static trapFocus(container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }
}
```

#### 7.3 Contraste couleurs
**Vérification :** Utiliser outil WCAG
**Proposé :** Variables CSS pour thèmes

```css
:root {
    --color-text-primary: #ffffff;
    --color-text-secondary: #b0b0b0;
    --color-bg-primary: #0f0f1e;
    --color-bg-secondary: #1a1a2e;
    --color-accent: #00d9ff;
    /* Ratio contraste > 4.5:1 */
}

@media (prefers-contrast: high) {
    :root {
        --color-text-primary: #ffffff;
        --color-bg-primary: #000000;
        --color-accent: #00ffff;
    }
}
```

---

### 8. MONITORING & ANALYTICS ⭐⭐⭐

#### 8.1 Performance monitoring
**Proposé :** Web Vitals tracking

```javascript
// frontend/js/monitoring/performance.js
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
    const body = {
        event: metric.name,
        value: metric.value,
        timestamp: Date.now()
    };
    
    navigator.sendBeacon('/api/metrics', JSON.stringify(body));
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

#### 8.2 Error tracking
**Proposé :** Capture erreurs non gérées

```javascript
// frontend/js/monitoring/error-tracker.js
export class ErrorTracker {
    static init() {
        window.addEventListener('error', (event) => {
            this.report({
                type: 'unhandled_error',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.report({
                type: 'unhandled_promise',
                reason: event.reason?.message || event.reason
            });
        });
    }
    
    static report(error) {
        console.error('[ErrorTracker]', error);
        // Optionnel : envoyer à un service externe
    }
}
```

---

## 📋 ROADMAP PROPOSÉE

### Phase 1 : Fondations (Semaines 1-2)
- [ ] Mise en place cache API (CacheService)
- [ ] ErrorHandler centralisé
- [ ] Configuration ESLint + Prettier
- [ ] Compression Gzip backend

### Phase 2 : Performance (Semaines 3-4)
- [ ] Lazy loading composants
- [ ] Optimisation tree.js (découpage)
- [ ] Throttle/debounce améliorés
- [ ] Skeleton screens

### Phase 3 : Qualité (Semaines 5-6)
- [ ] Tests unitaires (Jest)
- [ ] JSDoc complet
- [ ] Navigation clavier
- [ ] ARIA labels

### Phase 4 : Sécurité (Semaines 7-8)
- [ ] Rate limiting API
- [ ] CSRF tokens
- [ ] Content Security Policy
- [ ] Logging structuré

### Phase 5 : Advanced (Semaines 9-10)
- [ ] PWA / Service Worker
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] Thèmes accessibilité

---

## 📈 IMPACT ESTIMÉ

| Métrique | Actuel | Cible | Gain |
|----------|--------|-------|------|
| Temps chargement initial | ~2.5s | ~1.2s | **-52%** |
| Requêtes API/redondantes | 100% | ~40% | **-60%** |
| Score Lighthouse | ~75 | ~95 | **+20 pts** |
| Couverture tests | 0% | 80% | **+80%** |
| Accessibilité WCAG | Partiel | AA | **Conforme** |
| Tailles composants | 236-418 lignes | 50-150 lignes | **-60%** |

---

## 🛠 OUTILS RECOMMANDÉS

### Développement
- **Vite** : Build tool moderne (remplacement webpack)
- **TypeScript** : Typage statique (optionnel mais recommandé)
- **ESLint + Prettier** : Linting & formatage

### Testing
- **Jest** : Tests unitaires
- **Testing Library** : Tests composants
- **Playwright** : Tests E2E

### Monitoring
- **Web Vitals** : Performance réelle
- **Sentry** (optionnel) : Error tracking

### CI/CD
- **GitHub Actions** : Pipeline automatisé
- **Lighthouse CI** : Audit performance automatisé

---

## ✅ CHECKLIST IMMÉDIATE

### À faire cette semaine :
1. [ ] Ajouter `.gitignore` complet
2. [ ] Configurer HTTPS en production
3. [ ] Tester clé API YouTube
4. [ ] Documenter variables d'environnement
5. [ ] Créer fichier `CONTRIBUTING.md`

### Quick wins (< 1 jour) :
1. [ ] Compression Gzip backend
2. [ ] Debounce avec option cancel
3. [ ] Skeleton screens CSS
4. [ ] Raccourcis claviers basiques
5. [ ] ARIA labels manquants

---

## 📝 NOTES

- **Priorité absolue :** Performance perçue (cache + skeletons)
- **Attention particulière :** Ne pas casser l'existant (tests avant refactor)
- **Philosophie :** Progressive enhancement (fonctionne sans JS avancé)
- **Contrainte :** Garder architecture modulaire actuelle (force du projet)

---

**Document vivant** : À mettre à jour après chaque phase complétée

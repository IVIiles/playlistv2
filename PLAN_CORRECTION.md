# 📋 PLAN DE CORRECTION - PLAYLIST MNEMO v2.8
**Contraintes respectées :**
- ✅ Aucun changement majeur (pas de TypeScript, pas de Vite, pas de nouvelles dépendances)
- ✅ 100% compatible Infinity Free (PHP 7.4+, MySQL, pas de Node.js server-side)
- ✅ Focus critique sur version mobile (actuellement cassée)
- ✅ Modifications légères et progressives

---

## 🔴 PRIORITÉ 1 : CORRECTION MOBILE (CRITIQUE)
*La version mobile est actuellement inutilisable*

### 1.1 Layout responsive cassé
**Problème :** Overflows, boutons non-cliquables, texte illisible sur petits écrans
**Solution :**
```css
/* Dans style.css - Ajouter/Corriger media queries */
@media (max-width: 768px) {
  .container { padding: 10px; }
  .video-grid { grid-template-columns: 1fr; }
  .btn { min-height: 44px; min-width: 44px; } /* Touch targets */
  .modal { width: 95%; max-height: 90vh; overflow-y: auto; }
  body { font-size: 14px; }
}

@media (max-width: 480px) {
  .header h1 { font-size: 1.2rem; }
  .search-bar { width: 100%; }
  .controls { flex-wrap: wrap; justify-content: center; }
}
```

### 1.2 Navigation mobile inexistante
**Problème :** Pas de menu hamburger, navigation desktop inadaptée
**Solution :**
```html
<!-- Dans index.html -->
<button class="mobile-menu-btn" aria-label="Menu">☰</button>
<nav class="mobile-nav" hidden>
  <!-- Liens de navigation -->
</nav>
```
```javascript
// Dans main.js
document.querySelector('.mobile-menu-btn')?.addEventListener('click', () => {
  document.querySelector('.mobile-nav').toggleAttribute('hidden');
});
```

### 1.3 Gestes tactiles manquants
**Problème :** Swipe impossible pour naviguer dans les playlists
**Solution :**
```javascript
// Dans playlist-manager.js ou nouveau module touch-gestures.js
let touchStartX = 0;
let touchEndX = 0;

element.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
element.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  if (touchStartX - touchEndX > 50) nextPlaylist(); // Swipe left
  if (touchEndX - touchStartX > 50) prevPlaylist(); // Swipe right
});
```

### 1.4 Performance mobile (lag scrolling)
**Problème :** Rendu lent sur mobiles anciens
**Solution :**
- Activer `will-change: transform` sur éléments animés
- Réduire le nombre de vidéos affichées (virtual scrolling simple)
- Lazy loading des iframes YouTube plus agressif

---

## 🟠 PRIORITÉ 2 : PERFORMANCE (SANS NOUVELLES DÉPENDANCES)

### 2.1 Chargement initial trop lent
**Actions :**
- [ ] Minifier manuellement CSS/JS (ou utiliser outil en ligne avant déploiement)
- [ ] Différer chargement modules non-critiques avec `defer`
- [ ] Précharger polices critiques : `<link rel="preload" as="font" href="...">`
- [ ] Compresser images/icônes SVG existantes

### 2.2 Requêtes API redondantes
**Problème :** Appels multiples vers backend/api_yt.php
**Solution :**
```javascript
// Dans api-client.js
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchWithCache(url, options) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  const data = await fetch(url, options);
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### 2.3 Mémoire non libérée
**Problème :** Event listeners non nettoyés, fuites mémoire
**Solution :**
```javascript
// Pattern à appliquer dans tous les modules
class PlaylistManager {
  constructor() {
    this.handlers = {};
  }
  
  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }
  
  destroy() {
    Object.values(this.handlers).flat().forEach(h => {
      // Cleanup logic
    });
    this.handlers = {};
  }
}
```

### 2.4 Iframes YouTube chargées trop tôt
**Solution :**
```javascript
// Remplacer src par data-src, charger au scroll/clique
iframe.setAttribute('data-src', iframe.src);
iframe.removeAttribute('src');

// Observer
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const iframe = entry.target;
      iframe.src = iframe.dataset.src;
      observer.unobserve(iframe);
    }
  });
});
```

---

## 🟡 PRIORITÉ 3 : COHÉRENCE ARCHITECTURALE

### 3.1 Standardisation des modules ES6
**Problème :** Incohérences export/import entre modules
**Actions :**
- [ ] Vérifier que TOUS les modules utilisent `export`/`import` (pas de mélange avec window.xxx)
- [ ] Centraliser les constantes dans `config.js`
- [ ] Uniformiser la gestion d'erreurs (try/catch + logger unique)

### 3.2 Gestion d'état centralisée (léger)
**Sans Redux/Vuex**, créer un store simple :
```javascript
// store.js
export const store = {
  state: {
    currentPlaylist: null,
    isPlaying: false,
    volume: 0.8,
    playlists: []
  },
  listeners: [],
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(fn => fn(this.state));
  },
  
  subscribe(fn) {
    this.listeners.push(fn);
  }
};
```

### 3.3 Nommage et structure
**Actions :**
- [ ] Renommer variables ambiguës (`data`, `tmp`, `x`)
- [ ] Ajouter JSDoc sur fonctions complexes
- [ ] Uniformiser commentaires (français OU anglais, pas les deux)

---

## 🟢 PRIORITÉ 4 : SÉCURITÉ INFINITY FREE

### 4.1 Protection fichiers sensibles
**Actions :**
- [ ] Créer `.htaccess` pour bloquer accès direct à `/backend/` sauf API
- [ ] Vérifier que `config.php` n'est pas accessible publiquement
- [ ] Sanitiser TOUTES les entrées utilisateur (déjà partiellement fait)

```apache
# .htaccess dans backend/
<FilesMatch "\.(php)$">
  Order Deny,Allow
  Deny from all
</FilesMatch>
<FilesMatch "^api_.*\.php$">
  Order Allow,Deny
  Allow from all
</FilesMatch>
```

### 4.2 Headers de sécurité (via PHP)
```php
// Dans chaque fichier API
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
```

### 4.3 Rate limiting basique
```php
// Dans api_yt.php
session_start();
$lastRequest = $_SESSION['last_request'] ?? 0;
if (time() - $lastRequest < 1) {
  http_response_code(429);
  exit(json_encode(['error' => 'Too many requests']));
}
$_SESSION['last_request'] = time();
```

---

## 🔵 PRIORITÉ 5 : EXPÉRIENCE UTILISATEUR

### 5.1 Feedback visuel amélioré
**Actions :**
- [ ] Ajouter loaders pendant chargements API
- [ ] Toasts pour confirmations (playlist sauvegardée, etc.)
- [ ] États vides explicites ("Aucune vidéo", "Recherchez pour commencer")

### 5.2 Accessibilité (WCAG AA léger)
**Actions :**
- [ ] Ajouter attributs `aria-label` sur boutons icônes
- [ ] Contraste couleurs vérifié (outil en ligne)
- [ ] Navigation clavier fonctionnelle (tabindex)
- [ ] Focus visible sur tous éléments interactifs

### 5.3 Offline basique (Service Worker simple)
**Compatible Infinity Free :**
```javascript
// sw.js - À enregistrer depuis main.js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => 
      response || fetch(event.request)
    )
  );
});
```
*Cacher : HTML shell, CSS, JS, pas les vidéos*

---

## 📊 ROADMAP D'IMPLÉMENTATION

### Phase 1 (Urgent - 2-3 jours)
1. ✅ Corriger layout mobile (CSS media queries)
2. ✅ Ajouter navigation mobile (menu hamburger)
3. ✅ Implémenter gestes tactiles (swipe)
4. ✅ Optimiser chargement iframes YouTube

### Phase 2 (Important - 3-4 jours)
5. ✅ Cache API client-side
6. ✅ Nettoyer event listeners (fuites mémoire)
7. ✅ Store état centralisé léger
8. ✅ Standardiser modules ES6

### Phase 3 (Confort - 2-3 jours)
9. ✅ Sécurité .htaccess + headers PHP
10. ✅ Rate limiting basique
11. ✅ Feedback utilisateur (loaders, toasts)
12. ✅ Accessibilité de base (ARIA, contrastes)

### Phase 4 (Optionnel - 1-2 jours)
13. ✅ Service Worker offline
14. ✅ Virtual scrolling pour longues listes
15. ✅ Analytics basique (sans Google Analytics si possible)

---

## ⚠️ CONTRAINTES INFINITY FREE VÉRIFIÉES

✅ **Faisable :**
- HTML/CSS/JS statique
- PHP 7.4+ sans extensions exotiques
- MySQL basique
- Fichiers .htaccess
- Service Worker (HTTPS requis en prod)
- Sessions PHP

❌ **À éviter :**
- WebSockets (non supporté)
- Node.js server-side
- Composer/npm install server-side
- Cron jobs complexes (limité)
- Grosses bases de données (>1Go)
- Redis/Memcached

---

## 📝 CHECKLIST AVANT DÉPLOIEMENT

- [ ] Tester sur 3 tailles d'écran (desktop, tablette, mobile)
- [ ] Vérifier Chrome DevTools Mobile Simulator + vrais appareils
- [ ] Lighthouse score > 80 (Performance, Accessibility, Best Practices)
- [ ] Tous les liens/fonctions testés sur mobile tactile
- [ ] `.htaccess` configuré correctement
- [ ] Clé API YouTube configurée dans `config.php`
- [ ] HTTPS activé (obligatoire pour Service Worker et certaines APIs)

---

## 🎯 MÉTRIQUES DE SUCCÈS

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Score mobile Lighthouse | ~40 | >80 |
| Temps chargement initial | ~3.5s | <1.5s |
| Tailles clicables mobile | <44px | ≥44px |
| Requêtes API redondantes | ~15/page | <5/page |
| Fuites mémoire | Oui | Non |
| Accessibilité | Non testé | WCAG AA partiel |

---

**Prochaine étape :** Valider ce plan puis implémenter Phase 1 en priorité.

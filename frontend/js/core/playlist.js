// ============ PLAYLIST (CORE) ============
// Gère les données de la playlist : listes originales, courantes, filtrées,
// index de lecture, shuffle, filtrage, marquage des vidéos indisponibles.
// Émet des événements pour informer les composants UI.

export class Playlist extends EventTarget {
    constructor() {
        super();
        /** @type {Array<Object>} Liste originale (non mélangée, non filtrée) */
        this.original = [];
        /** @type {Array<Object>} Liste de lecture active (mélangée ou non) */
        this.current = [];
        /** @type {Array<Object>} Liste affichée après filtrage local */
        this.filtered = [];
        /** @type {number} Index dans la liste "current" */
        this.index = 0;
        /** @type {boolean} État du mode aléatoire */
        this.isShuffled = false;
        /** @type {Set<string>} IDs des vidéos marquées comme indisponibles */
        this.unavailable = new Set();
    }

    /**
     * Remplace toutes les listes par une nouvelle liste de vidéos.
     * Réinitialise l'index, le shuffle et le filtre.
     * @param {Array<Object>} videos
     */
    setVideos(videos = []) {
        this.original = [...videos];
        this.current = [...videos];
        this.filtered = [...videos];
        this.index = 0;
        this.isShuffled = false;
        this._notify('change');
        this._notify('filterChange');
    }

    /**
     * Ajoute des vidéos à la fin de la playlist sans réinitialiser l'index.
     * @param {Array<Object>} videos
     */
    addVideos(videos = []) {
        this.original = [...this.original, ...videos];
        // On ajoute également dans current et filtered (si pas de filtre actif)
        this.current = [...this.current, ...videos];
        if (this.filtered !== this.current) {
            // Si un filtre est actif, on ne les ajoute pas automatiquement dans filtered
            // Le composant UI ré-appliquera le filtre si besoin
            this.filtered = [...this.filtered, ...videos];
        } else {
            this.filtered = [...this.current];
        }
        this._notify('change');
        this._notify('filterChange');
    }

    /**
     * Retourne la vidéo en cours de lecture.
     * @returns {Object|undefined}
     */
    getCurrentVideo() {
        return this.current[this.index];
    }

    /**
     * Définit un nouvel index de lecture et notifie le changement.
     * @param {number} newIndex
     */
    setIndex(newIndex) {
        if (newIndex >= 0 && newIndex < this.current.length) {
            this.index = newIndex;
            this._notify('change');
        }
    }

    /**
     * Passe à l'index suivant en évitant les vidéos indisponibles.
     * @returns {number} Nouvel index
     */
    nextIndex() {
        let next = this.index + 1;
        let attempts = 0;
        while (attempts < this.current.length) {
            if (next >= this.current.length) next = 0;
            const video = this.current[next];
            if (video && !this.unavailable.has(video.id)) {
                this.index = next;
                this._notify('change');
                return next;
            }
            next++;
            attempts++;
        }
        return this.index; // Aucune vidéo disponible, on reste sur place
    }

    /**
     * Passe à l'index précédent en évitant les vidéos indisponibles.
     * @returns {number} Nouvel index
     */
    prevIndex() {
        let prev = this.index - 1;
        let attempts = 0;
        while (attempts < this.current.length) {
            if (prev < 0) prev = this.current.length - 1;
            const video = this.current[prev];
            if (video && !this.unavailable.has(video.id)) {
                this.index = prev;
                this._notify('change');
                return prev;
            }
            prev--;
            attempts++;
        }
        return this.index;
    }

    /**
     * Active ou désactive le mode aléatoire.
     * @param {boolean} enable
     */
    toggleShuffle(enable = !this.isShuffled) {
        if (enable) {
            // Mélange de la liste current
            for (let i = this.current.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.current[i], this.current[j]] = [this.current[j], this.current[i]];
            }
            this.isShuffled = true;
        } else {
            // Rétablissement de l'ordre original
            this.current = [...this.original];
            this.isShuffled = false;
        }
        // Ré-appliquer le filtre éventuel
        this._notify('change');
        this._notify('filterChange');
    }

    /**
     * Filtre la liste "filtered" en fonction d'un texte de recherche.
     * @param {string} text - Texte saisi
     */
    filter(text = '') {
        const term = text.toLowerCase().trim();
        if (!term) {
            this.filtered = [...this.current];
        } else {
            const terms = term.split(' ').filter(t => t.length > 0);
            this.filtered = this.current.filter(v => {
                const searchText = ((v.artist || '') + ' ' + (v.song_title || '') + ' ' + (v.album || '')).toLowerCase();
                return terms.every(t => searchText.includes(t));
            });
        }
        this._notify('filterChange');
    }

    /**
     * Déplace un élément de la liste filtrée (et courante si pas de filtre actif).
     * @param {string} videoId - ID de la vidéo déplacée
     * @param {number} targetIndex - Nouvelle position dans filtered
     */
    moveItem(videoId, targetIndex) {
        const draggedIndex = this.filtered.findIndex(v => v.id === videoId);
        if (draggedIndex === -1 || targetIndex < 0 || targetIndex >= this.filtered.length) return;
        if (draggedIndex === targetIndex) return;

        const item = this.filtered.splice(draggedIndex, 1)[0];
        this.filtered.splice(targetIndex, 0, item);

        // Si aucun filtre actif, on synchronise current
        if (this.filtered === this.current) {
            // Déjà synchronisé car même référence (on a modifié this.filtered qui est this.current)
            // Si ce n'est pas la même référence (filtre désactivé, filtered est une copie), on doit aussi maj current
            if (this.filtered !== this.current) {
                // Cas où on a un filtre désactivé mais filtered est une copie (ne devrait pas arriver avec la logique actuelle)
                // On va gérer prudemment : on met à jour current avec la même référence
                const currentIndex = this.current.findIndex(v => v.id === videoId);
                if (currentIndex !== -1) {
                    const currentItem = this.current.splice(currentIndex, 1)[0];
                    this.current.splice(targetIndex, 0, currentItem);
                }
            }
        }

        this._notify('filterChange');
    }

    /**
     * Marque une vidéo comme indisponible.
     * @param {string} videoId
     */
    markUnavailable(videoId) {
        this.unavailable.add(videoId);
        this._notify('change');
    }

    /**
     * Retourne le nombre total de vidéos (non filtrées).
     * @returns {number}
     */
    get totalCount() {
        return this.current.length;
    }

    /**
     * Retourne le nombre de vidéos filtrées visibles.
     * @returns {number}
     */
    get filteredCount() {
        return this.filtered.length;
    }

    /**
     * Vide toutes les listes.
     */
    clear() {
        this.original = [];
        this.current = [];
        this.filtered = [];
        this.index = 0;
        this.isShuffled = false;
        this._notify('change');
        this._notify('filterChange');
    }

    // ============ ÉVÉNEMENTS ============

    /**
     * Notifie tous les écouteurs d'un type d'événement.
     * @param {string} type - 'change' (index, liste) ou 'filterChange' (filtre)
     */
    _notify(type) {
        this.dispatchEvent(new Event(type));
    }
}
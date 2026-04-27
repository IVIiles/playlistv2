// ============ COMPOSANT PLAYLIST UI ============
// Gère l'affichage de la liste des titres, le drag & drop,
// la recherche locale, le shuffle et les interactions utilisateur.

import { escapeHtml, debounce } from '../utils.js';
import { LABELS_PLAYLIST } from '../../constants/labels_playlist.js';

export class PlaylistUIComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.playlist - Instance Playlist (core)
     * @param {Function} services.notify - Fonction de notification toast
     * @param {Object} services.dom - Références DOM nécessaires
     * @param {HTMLElement} services.dom.playlistContainer - Élément <ul> contenant les titres
     * @param {HTMLElement} services.dom.searchInput - Champ de recherche
     * @param {HTMLElement} services.dom.clearSearch - Bouton X pour effacer la recherche
     * @param {HTMLElement} services.dom.playlistCount - Élément affichant le nombre de titres
     * @param {HTMLElement} services.dom.shuffleBtn - Bouton shuffle
     */
    constructor(services) {
        super(); // constructeur EventTarget
        this.playlist = services.playlist;
        this.notify = services.notify;
        this.dom = services.dom;

        this.initUI();
        this.bindPlaylistEvents();
    }

    /**
     * Initialise les écouteurs sur les éléments DOM.
     */
    initUI() {
        if (this.dom.shuffleBtn) {
            this.dom.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }

        // Recherche avec debounce
        const debouncedFilter = debounce((value) => {
            this.playlist.filter(value);
        }, 300);

        if (this.dom.searchInput) {
            this.dom.searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                debouncedFilter(value);
                if (this.dom.clearSearch) {
                    this.dom.clearSearch.style.display = value ? 'block' : 'none';
                }
            });
        }

        if (this.dom.clearSearch) {
            this.dom.clearSearch.addEventListener('click', () => {
                if (this.dom.searchInput) {
                    this.dom.searchInput.value = '';
                    this.dom.searchInput.dispatchEvent(new Event('input'));
                }
            });
        }
    }

    /**
     * S'abonne aux événements de l'instance Playlist pour rafraîchir l'affichage.
     */
    bindPlaylistEvents() {
        this.playlist.addEventListener('filterChange', () => this.render());
        this.playlist.addEventListener('change', () => {
            // Mise à jour de l'élément actif sans re-render complet
            this.highlightActive();
            this.updateShuffleButton();
        });
        // Affichage initial
        this.render();
    }

    /**
     * Reconstruit entièrement la liste des titres.
     */
    render() {
        const list = this.dom.playlistContainer;
        if (!list) return;

        list.innerHTML = '';
        const videos = this.playlist.filtered;
        const currentVideo = this.playlist.getCurrentVideo();
        const currentVideoId = currentVideo ? currentVideo.id : null;

        if (!videos || videos.length === 0) {
            const li = document.createElement('li');
            li.className = 'no-results';
            li.textContent = LABELS_PLAYLIST.LABEL_NO_RESULTS;
            list.appendChild(li);
            this.updateCount();
            return;
        }

        const fragment = document.createDocumentFragment();
        videos.forEach((video, displayIndex) => {
            const li = document.createElement('li');
            li.className = `playlist-item ${video.id === currentVideoId ? 'active' : ''}`;
            if (this.playlist.unavailable.has(video.id)) {
                li.classList.add('unavailable');
            }
            li.setAttribute('draggable', 'true');
            li.dataset.index = displayIndex;
            li.dataset.id = video.id;

            // Création des lignes d'info
            li.appendChild(this.createInfoRow(LABELS_PLAYLIST.LABEL_ARTISTE, video.artist || ''));
            li.appendChild(this.createInfoRow(LABELS_PLAYLIST.LABEL_TITRE, video.song_title || ''));
            if (video.album && video.album !== 'Inconnu') {
                li.appendChild(this.createInfoRow(LABELS_PLAYLIST.LABEL_ALBUM, video.album));
            }

            // Clic pour lecture
            li.addEventListener('click', () => {
                // Trouver l'index réel dans la liste "current" (non filtrée)
                const realIndex = this.playlist.current.findIndex(v => v.id === video.id);
                if (realIndex !== -1) {
                    this.playlist.setIndex(realIndex);
                    this.dispatchEvent(new CustomEvent('play-track', { detail: { index: realIndex, video } }));
                }
            });

            this.setupDragEvents(li);
            fragment.appendChild(li);
        });

        list.appendChild(fragment);
        this.updateCount();
        this.updateShuffleButton();
    }

    /**
     * Met à jour le nombre de titres affiché.
     */
    updateCount() {
        const countEl = this.dom.playlistCount;
        if (countEl) {
            countEl.textContent = `${this.playlist.filteredCount} ${LABELS_PLAYLIST.LABEL_TITLES}`;
        }
    }

    /**
     * Met en évidence l'élément actif sans re-rendu complet.
     */
    highlightActive() {
        const currentVideo = this.playlist.getCurrentVideo();
        const currentId = currentVideo ? currentVideo.id : null;
        const items = this.dom.playlistContainer?.querySelectorAll('.playlist-item');
        if (!items) return;
        items.forEach(item => {
            if (item.dataset.id === currentId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Met à jour le libellé du bouton shuffle en fonction de l'état.
     */
    updateShuffleButton() {
        const btn = this.dom.shuffleBtn;
        if (!btn) return;
        btn.textContent = this.playlist.isShuffled ? LABELS_PLAYLIST.BTN_SHUFFLE_ACTIVE : LABELS_PLAYLIST.BTN_SHUFFLE;
    }

    /**
     * Active/désactive le mode aléatoire.
     */
    toggleShuffle() {
        const wasShuffled = this.playlist.isShuffled;
        this.playlist.toggleShuffle(!wasShuffled);
        this.notify(wasShuffled ? LABELS_PLAYLIST.TOAST_SHUFFLE_OFF : LABELS_PLAYLIST.TOAST_SHUFFLE_ON, 'success');
    }

    /**
     * Crée une ligne d'information (label + valeur) sécurisée.
     * @param {string} label
     * @param {string} value
     * @returns {HTMLElement}
     */
    createInfoRow(label, value) {
        const row = document.createElement('span');
        row.className = 'video-info-row';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'video-info-label';
        labelSpan.textContent = label + ' :';

        const valueSpan = document.createElement('span');
        valueSpan.className = 'video-info-value';
        valueSpan.textContent = value;

        row.appendChild(labelSpan);
        row.appendChild(document.createTextNode(' '));
        row.appendChild(valueSpan);
        return row;
    }

    /**
     * Configure les événements de drag & drop sur un élément <li>.
     * @param {HTMLElement} li
     */
    setupDragEvents(li) {
        li.addEventListener('dragstart', (e) => {
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            // Stockage de l'ID dans l'objet dataTransfer
            e.dataTransfer.setData('text/plain', li.dataset.id);
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('drag-over'));
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            li.classList.add('drag-over');
        });

        li.addEventListener('dragleave', () => li.classList.remove('drag-over'));

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetIndex = parseInt(li.dataset.index, 10);
            if (draggedId && !isNaN(targetIndex)) {
                this.playlist.moveItem(draggedId, targetIndex);
            }
        });
    }
}
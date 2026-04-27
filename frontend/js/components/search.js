// ============ COMPOSANT RECHERCHE ============
// Gère la modale "Rechercher" : formulaire de recherche, appels API, affichage des résultats.

import { escapeHtml } from '../utils.js';
import { LABELS_PLAYLIST } from '../constants/labels_playlist.js';

export class SearchComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.api - Instance ApiService
     * @param {Function} services.notify - Fonction de notification toast
     * @param {Object} services.dom - Références DOM
     * @param {HTMLElement} services.dom.modalOverlay - Overlay (#mod-rechercher)
     * @param {HTMLElement} services.dom.modalContent - Conteneur (#mod-rechercher-app)
     * @param {HTMLElement} services.dom.closeBtn - Bouton fermeture (#modRechercherClose)
     */
    constructor(services) {
        super();
        this.api = services.api;
        this.notify = services.notify;
        this.dom = services.dom;
        this.bindEvents();
    }

    /**
     * Attache les événements de fermeture.
     */
    bindEvents() {
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.dom.modalOverlay) this.close();
            });
        }
    }

    /**
     * Ouvre la modale et initialise l'interface de recherche.
     */
    open() {
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.classList.add('active');
        }
        this.initSearchUI();
    }

    /**
     * Ferme la modale.
     */
    close() {
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.classList.remove('active');
        }
    }

    /**
     * Initialise les champs et écouteurs de la modale.
     */
    initSearchUI() {
        const container = this.dom.modalContent;
        if (!container) return;

        // Contenu statique de la modale (présent dans index.html, on réinitialise juste les événements)
        const searchInput = document.getElementById('searchInputModal');
        const clearBtn = document.getElementById('clearSearchModal');
        const status = document.getElementById('searchStatus');

        if (status && LABELS_PLAYLIST.LABEL_SEARCH_START) {
            status.textContent = LABELS_PLAYLIST.LABEL_SEARCH_START;
        }

        if (searchInput) {
            searchInput.value = ''; // reset
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
                if (query.length >= 3) {
                    this.performSearch(query);
                } else if (query.length === 0) {
                    this.clearSearch();
                }
            });
        }

        if (clearBtn) {
            clearBtn.style.display = 'none';
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
        }

        // Nettoyage des résultats précédents
        const results = document.getElementById('searchResults');
        if (results) results.innerHTML = '';
    }

    /**
     * Vide les résultats de recherche.
     */
    clearSearch() {
        const results = document.getElementById('searchResults');
        const status = document.getElementById('searchStatus');
        if (results) results.innerHTML = '';
        if (status && LABELS_PLAYLIST.LABEL_SEARCH_START) {
            status.textContent = LABELS_PLAYLIST.LABEL_SEARCH_START;
        }
    }

    /**
     * Exécute une recherche via l'API et affiche les résultats.
     * @param {string} query
     */
    async performSearch(query) {
        const status = document.getElementById('searchStatus');
        const results = document.getElementById('searchResults');

        if (status && LABELS_PLAYLIST.LABEL_SEARCH_LOADING) {
            status.textContent = LABELS_PLAYLIST.LABEL_SEARCH_LOADING;
        }

        // Récupération des options de recherche
        const searchArtist = document.getElementById('searchArtist')?.checked;
        const searchAlbum = document.getElementById('searchAlbum')?.checked;
        const searchTitle = document.getElementById('searchTitle')?.checked;

        const fields = [];
        if (searchArtist) fields.push('artist');
        if (searchAlbum) fields.push('album');
        if (searchTitle) fields.push('title');

        if (fields.length === 0) {
            if (status) status.textContent = 'Sélectionnez au moins une option';
            return;
        }

        try {
            const data = await this.api.fetchSearch(query, fields);

            if (results) {
                results.innerHTML = '';

                if (!data.files || data.files.length === 0) {
                    if (status && LABELS_PLAYLIST.LABEL_SEARCH_NO_RESULTS) {
                        status.textContent = LABELS_PLAYLIST.LABEL_SEARCH_NO_RESULTS;
                    }
                    return;
                }

                if (status) {
                    status.textContent = `${data.files.length} ${LABELS_PLAYLIST.LABEL_SEARCH_RESULTS}`;
                }

                const cardsHtml = data.files.map(file => `
                    <div class="mod-card" data-file="${escapeHtml(file.filename)}" data-path="${escapeHtml(file.folderPath || '')}">
                        <div class="mod-card-artist">${escapeHtml(file.artist)}</div>
                        <div class="mod-card-album">${escapeHtml(file.album)}</div>
                        <div class="mod-card-style">${file.style ? 'Style: ' + escapeHtml(file.style) : ''}</div>
                    </div>
                `).join('');

                results.innerHTML = `<div class="mod-cards-grid">${cardsHtml}</div>`;

                // Événement sur chaque carte
                results.querySelectorAll('.mod-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const file = card.dataset.file;
                        const path = card.dataset.path;
                        this.close();
                        this.dispatchEvent(new CustomEvent('select-file', { detail: { file, path } }));
                    });
                });
            }
        } catch (error) {
            console.error('Erreur search:', error);
            if (status) status.textContent = LABELS_PLAYLIST.MSG_ERROR_FETCH;
        }
    }
}
// ============ COMPOSANT NOUVEAUTÉS ============
// Gère la modale "Nouveautés" : affichage des 20 fichiers CSV les plus récents.

import { escapeHtml } from '../utils.js';
import { LABELS_PLAYLIST } from '../../constants/labels_playlist.js';

export class RecentComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.api - Instance ApiService
     * @param {Function} services.notify - Fonction de notification toast
     * @param {Object} services.dom - Références DOM
     * @param {HTMLElement} services.dom.modalOverlay - Overlay de la modale (#mod-nouveautes)
     * @param {HTMLElement} services.dom.modalContent - Conteneur dynamique (#mod-nouveaute-app)
     * @param {HTMLElement} services.dom.closeBtn - Bouton de fermeture (#modNouveautesClose)
     */
    constructor(services) {
        super();
        this.api = services.api;
        this.notify = services.notify;
        this.dom = services.dom;
        this.bindEvents();
    }

    /**
     * Attache les événements d'ouverture/fermeture de la modale.
     */
    bindEvents() {
        // Fermeture via bouton
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.close());
        }
        // Fermeture en cliquant sur l'overlay
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.dom.modalOverlay) this.close();
            });
        }
    }

    /**
     * Ouvre la modale et charge les données.
     */
    async open() {
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.classList.add('active');
        }
        await this.loadRecentFiles();
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
     * Charge la liste des fichiers récents via l'API et les affiche.
     */
    async loadRecentFiles() {
        try {
            const data = await this.api.fetchRecent();
            this.renderCards(data.files || []);
        } catch (error) {
            console.error('Erreur loadRecentFiles:', error);
            this.notify(LABELS_PLAYLIST.MSG_ERROR_FETCH, 'error');
        }
    }

    /**
     * Affiche les cartes dans la modale.
     * @param {Array} files
     */
    renderCards(files) {
        const container = this.dom.modalContent;
        if (!container) return;

        if (!files || files.length === 0) {
            container.innerHTML = '<p class="no-results">Aucun fichier récent</p>';
            return;
        }

        const cardsHtml = files.map(file => `
            <div class="mod-card" data-file="${escapeHtml(file.filename)}" data-path="${escapeHtml(file.folderPath || '')}">
                <div class="mod-card-artist">${escapeHtml(file.artist)}</div>
                <div class="mod-card-album">${escapeHtml(file.album)}</div>
                <div class="mod-card-style">${file.style ? 'Style: ' + escapeHtml(file.style) : ''}</div>
                <div class="mod-card-date">Ajouté: ${this.formatDate(file.modified)}</div>
            </div>
        `).join('');

        container.innerHTML = `<div class="mod-cards-grid">${cardsHtml}</div>`;

        // Événement sur chaque carte
        container.querySelectorAll('.mod-card').forEach(card => {
            card.addEventListener('click', () => {
                const file = card.dataset.file;
                const path = card.dataset.path;
                this.close();
                // Émettre un événement pour que l'orchestrateur charge la playlist
                this.dispatchEvent(new CustomEvent('select-file', { detail: { file, path } }));
            });
        });
    }

    /**
     * Formate un timestamp Unix en date lisible.
     * @param {number} timestamp
     * @returns {string}
     */
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}
// ============ COMPOSANT RADIO ============
// Gère la modale "Radio" : sélection des dossiers/genres,
// nombre de titres, lancement de la radio aléatoire.

import { escapeHtml } from '../utils.js';
import { LABELS_PLAYLIST } from '../../constants/labels_playlist.js';

const RADIO_CONFIG = {
    DEPTH: 2
};

export class RadioComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.api - Instance ApiService
     * @param {Object} services.playlist - Instance Playlist (core)
     * @param {Object} services.player - Instance Player (core)
     * @param {Function} services.notify - Fonction de notification toast
     * @param {Object} services.dom - Références DOM
     * @param {HTMLElement} services.dom.modalOverlay - Overlay (#mod-radio)
     * @param {HTMLElement} services.dom.modalContent - Conteneur (#mod-radio-app)
     * @param {HTMLElement} services.dom.closeBtn - Bouton fermeture (#modRadioClose)
     */
    constructor(services) {
        super();
        this.api = services.api;
        this.playlist = services.playlist;
        this.player = services.player;
        this.notify = services.notify;
        this.dom = services.dom;
        this.treeCache = null;
        this.bindEvents();
    }

    /**
     * Attache les événements de fermeture de la modale.
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
     * Ouvre la modale et charge l'arborescence pour la sélection.
     */
    open() {
        this.treeCache = null;
        if (this.dom.modalOverlay) {
            this.dom.modalOverlay.classList.add('active');
        }
        this.initUI();
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
     * Initialise l'interface de la radio (formulaire avec checkboxes).
     */
    async initUI() {
        const container = this.dom.modalContent;
        if (!container) return;
        const labels = LABELS_PLAYLIST;

        container.innerHTML = '<div class="radio-loading">' + labels.LABEL_RADIO_LOADING + '</div>';

        try {
            const tree = await this.loadRadioFolders();
            container.innerHTML = this.buildRadioFormHTML(tree);
            this.attachRadioEvents();
        } catch (error) {
            console.error('loadRadioFolders error:', error);
            container.innerHTML = '<div class="radio-error">' + labels.LABEL_RADIO_ERROR_FETCH + '</div>';
        }
    }

    /**
     * Charge l'arborescence pour la radio (mise en cache).
     * @returns {Promise<Object>}
     */
    async loadRadioFolders() {
        if (!this.treeCache) {
            const data = await this.api.fetchScanRecursive(RADIO_CONFIG.DEPTH);
            if (!data || !data.success || !data.tree) {
                return {};
            }
            this.treeCache = data.tree;
        }
        return this.treeCache;
    }

    /**
     * Construit le formulaire HTML de la modale Radio.
     * @param {Object} tree
     * @returns {string}
     */
    buildRadioFormHTML(tree) {
        const labels = LABELS_PLAYLIST;
        if (!tree || !tree.folders || Object.keys(tree.folders).length === 0) {
            return '<div class="radio-no-folders">' + labels.LABEL_RADIO_NO_FOLDERS + '</div>';
        }

        const roots = Object.keys(tree.folders).sort();
        const sections = roots.map(rootName => {
            const genres = tree.folders[rootName]?.folders || {};
            const genreList = Object.keys(genres).sort();
            const genreCheckboxes = genreList.map(genre => {
                const fullPath = rootName + '/' + genre;
                return `<label class="radio-genre-checkbox">
                    <input type="checkbox" name="radioFolders" value="${escapeHtml(fullPath)}">
                    <span>${escapeHtml(genre)}</span>
                </label>`;
            }).join('');
            return `
                <div class="radio-section">
                    <div class="radio-section-header">${escapeHtml(rootName)}</div>
                    <div class="radio-genres">${genreCheckboxes}</div>
                </div>
            `;
        }).join('');

        // Nouvelle structure : zone de contrôle en haut, puis messages, puis la liste
        return `
            <div class="radio-form">
                <div class="radio-controls">
                    <div class="form-group">
                        <label for="radioCount">${labels.LABEL_RADIO_COUNT}</label>
                        <input type="number" id="radioCount" class="radio-input-count" 
                            value="50" min="1" max="500" 
                            placeholder="${labels.LABEL_RADIO_PLACEHOLDER_COUNT}">
                    </div>
                    <button class="btn" id="radioStartBtn">${labels.BTN_RADIO_START}</button>
                </div>
                <div class="radio-progress" id="radioProgress"></div>
                <div class="radio-error" id="radioError"></div>
                <div class="radio-success" id="radioSuccess"></div>
                <div class="radio-folders-list">${sections}</div>
            </div>
        `;
    }

    /**
     * Attache les événements du formulaire Radio.
     */
    attachRadioEvents() {
        const countInput = document.getElementById('radioCount');
        const startBtn = document.getElementById('radioStartBtn');

        if (countInput) {
            countInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') startBtn?.click();
            });
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRadio());
        }
    }

    /**
     * Lance la génération de la playlist radio.
     */
    async startRadio() {
        const countInput = document.getElementById('radioCount');
        const progressEl = document.getElementById('radioProgress');
        const errorEl = document.getElementById('radioError');
        const successEl = document.getElementById('radioSuccess');
        const startBtn = document.getElementById('radioStartBtn');

        if (!countInput || !progressEl || !errorEl || !successEl) return;

        const count = parseInt(countInput.value) || 50;
        const checkboxes = document.querySelectorAll('input[name="radioFolders"]:checked');
        const folders = Array.from(checkboxes).map(cb => cb.value);

        // Réinitialisation des messages
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        if (count < 1 || count > 500) {
            errorEl.textContent = LABELS_PLAYLIST.LABEL_RADIO_ERROR_COUNT;
            errorEl.style.display = 'block';
            return;
        }
        if (folders.length === 0) {
            errorEl.textContent = LABELS_PLAYLIST.LABEL_RADIO_ERROR_FOLDERS;
            errorEl.style.display = 'block';
            return;
        }

        startBtn.disabled = true;
        progressEl.textContent = LABELS_PLAYLIST.LABEL_RADIO_LOADING;
        progressEl.style.display = 'block';

        try {
            const data = await this.api.fetchRadio(count, folders);

            if (!data || data.success === false) {
                throw new Error(data?.error || LABELS_PLAYLIST.LABEL_RADIO_ERROR_FETCH);
            }

            // Mise à jour de la playlist via l'instance Playlist
            this.playlist.setVideos(data.videos || []);

            // Lancement de la lecture du premier titre
            const firstVideo = this.playlist.getCurrentVideo();
            if (firstVideo) {
                this.player.loadVideoById(firstVideo.id);
            }

            this.close();

            const msg = LABELS_PLAYLIST.LABEL_RADIO_SUCCESS.replace('{}', data.count);
            this.notify(msg, 'success');
        } catch (error) {
            console.error('startRadio error:', error);
            errorEl.textContent = '❌ ' + escapeHtml(error.message);
            errorEl.style.display = 'block';
            progressEl.style.display = 'none';
        } finally {
            startBtn.disabled = false;
        }
    }
}
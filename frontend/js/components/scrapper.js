// ============ COMPOSANT SCRAPPER ============
// Gère la modale "Scrapper" : saisie d'une URL de playlist YouTube,
// appel API de scraping, téléchargement du CSV généré.

import { escapeHtml } from '../utils.js';

export class ScrapperComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.api - Instance ApiService
     * @param {Function} services.notify - Fonction de notification toast
     * @param {Object} services.dom - Références DOM
     * @param {HTMLElement} services.dom.modalOverlay - Overlay (#mod-scrapper)
     * @param {HTMLElement} services.dom.modalContent - Conteneur (#mod-scrapper-app)
     * @param {HTMLElement} services.dom.closeBtn - Bouton fermeture (#modScrapperClose)
     */
    constructor(services) {
        super();
        this.api = services.api;
        this.notify = services.notify;
        this.dom = services.dom;
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
     * Ouvre la modale et construit l'interface.
     */
    open() {
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
     * Construit le formulaire de la modale et attache les événements.
     * Les messages d'erreur/succès/progression sont masqués par défaut via CSS.
     */
    initUI() {
        const container = this.dom.modalContent;
        if (!container) return;

        const labels = LABELS_PLAYLIST;

        container.innerHTML = `
            <div class="scrapper-form">
                <div class="form-group">
                    <label for="scrapperUrl">${labels.LABEL_SCRAPPER_URL || 'URL de la Playlist YouTube'}</label>
                    <input type="text" id="scrapperUrl" class="search-input-modal" 
                        placeholder="https://www.youtube.com/playlist?list=..." 
                        data-label="scrapper_url_placeholder">
                </div>
                <button class="btn" id="scrapperStartBtn">${labels.BTN_SCRAPPER_START || "Lancer l'extraction"}</button>
                <div class="scrapper-progress" id="scrapperProgress"></div>
                <div class="scrapper-error" id="scrapperError"></div>
                <div class="scrapper-success" id="scrapperSuccess"></div>
            </div>
        `;

        const urlInput = document.getElementById('scrapperUrl');
        const startBtn = document.getElementById('scrapperStartBtn');

        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') startBtn?.click();
            });
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startScraping());
        }
    }

    /**
     * Lance le processus de scraping.
     */
    async startScraping() {
        const urlInput = document.getElementById('scrapperUrl');
        const startBtn = document.getElementById('scrapperStartBtn');
        const progressEl = document.getElementById('scrapperProgress');
        const errorEl = document.getElementById('scrapperError');
        const successEl = document.getElementById('scrapperSuccess');

        if (!urlInput || !progressEl || !errorEl || !successEl) return;

        const youtubeUrl = urlInput.value.trim();

        // Réinitialisation des messages (ils sont cachés par CSS, mais on s'assure qu'ils le restent)
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        progressEl.style.display = 'none';

        if (!youtubeUrl) {
            errorEl.textContent = LABELS_PLAYLIST.MSG_ERROR_SCRAPPER_URL || 'Veuillez entrer une URL de playlist';
            errorEl.style.display = 'block';
            return;
        }

        const playlistId = this.extractPlaylistId(youtubeUrl);
        if (!playlistId) {
            errorEl.textContent = LABELS_PLAYLIST.MSG_ERROR_SCRAPPER_URL || 'URL de playlist non reconnue';
            errorEl.style.display = 'block';
            return;
        }

        startBtn.disabled = true;
        progressEl.textContent = LABELS_PLAYLIST.LABEL_SCRAPPER_LOADING || 'Récupération des vidéos...';
        progressEl.style.display = 'block';

        try {
            const data = await this.api.fetchScrape(youtubeUrl);

            if (!data || data.success === false) {
                throw new Error(data?.error || LABELS_PLAYLIST.MSG_ERROR_FETCH);
            }

            progressEl.textContent = `Génération du fichier CSV (${data.count} vidéos)...`;

            const filename = data.suggestedFilename || `playlist_${playlistId}_videos.csv`;
            this.downloadCsv(data.csv, filename);

            if (data.detectedArtist && data.detectedArtist !== 'Artiste Inconnu') {
                this.notify(
                    `Artiste détecté avec succès: ${data.detectedArtist} (${data.confidence}% confiance)`,
                    'success'
                );
            }

            progressEl.style.display = 'none';
            successEl.textContent = `✅ ${data.count} vidéos exportées avec succès !\nFichier: ${filename}`;
            successEl.style.display = 'block';

            // Réinitialisation du champ
            urlInput.value = '';
        } catch (error) {
            console.error('Erreur scrap:', error);
            errorEl.textContent = `❌ ${escapeHtml(error.message)}`;
            errorEl.style.display = 'block';
            progressEl.style.display = 'none';
        } finally {
            startBtn.disabled = false;
        }
    }

    /**
     * Extrait l'ID d'une playlist YouTube depuis une URL.
     * @param {string} url
     * @returns {string|null}
     */
    extractPlaylistId(url) {
        const patterns = [/[?&]list=([a-zA-Z0-9_-]+)/i];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Télécharge un contenu CSV sous forme de fichier.
     * @param {string} csvContent
     * @param {string} filename
     */
    downloadCsv(csvContent, filename) {
        // Nettoyage du nom de fichier pour éviter les chemins
        const safeFilename = filename.split('/').pop().split('\\').pop();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', safeFilename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
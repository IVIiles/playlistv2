// ============ ORCHESTRATEUR ============
import { ApiService } from './api.js';
import { Player } from './core/player.js';
import { Playlist } from './core/playlist.js';
import { TreeComponent } from './components/tree.js';
import { PlaylistUIComponent } from './components/playlist-ui.js';
import { RecentComponent } from './components/recent.js';
import { SearchComponent } from './components/search.js';
import { ScrapperComponent } from './components/scrapper.js';
import { RadioComponent } from './components/radio.js';
import { showNotification, initNotifications } from './ui/notifications.js';
import { initLayoutToggles } from './ui/layout.js';
import { LABELS_PLAYLIST } from './constants/labels_playlist.js';

// ============ INITIALISATION DES LABELS ============
// (inchangée, purement DOM)
function initLabels() {
    // Titre page
    const titleEl = document.querySelector('[data-label="title"]');
    if (titleEl && LABELS_PLAYLIST.TITLE_PAGE) titleEl.textContent = LABELS_PLAYLIST.TITLE_PAGE;
    const searchInput = document.getElementById('searchInput');
    if (searchInput && LABELS_PLAYLIST.LABEL_SEARCH) searchInput.placeholder = LABELS_PLAYLIST.LABEL_SEARCH;
    const loader = document.getElementById('playerLoader');
    if (loader && LABELS_PLAYLIST.LABEL_LOADER) loader.textContent = LABELS_PLAYLIST.LABEL_LOADER;
    const playlistTitle = document.querySelector('[data-label="playlist_title"]');
    if (playlistTitle) playlistTitle.textContent = LABELS_PLAYLIST.LABEL_PLAYLIST;
    const navTitle = document.querySelector('[data-label="nav_title"]');
    if (navTitle) navTitle.textContent = LABELS_PLAYLIST.LABEL_TREE_TITLE;
    const expandAllBtn = document.getElementById('expandAllBtn');
    if (expandAllBtn && LABELS_PLAYLIST.BTN_EXPAND_ALL) expandAllBtn.textContent = LABELS_PLAYLIST.BTN_EXPAND_ALL;
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    if (collapseAllBtn && LABELS_PLAYLIST.BTN_COLLAPSE_ALL) collapseAllBtn.textContent = LABELS_PLAYLIST.BTN_COLLAPSE_ALL;
    const togglePlaylist = document.querySelector('[data-label="toggle_playlist"]');
    if (togglePlaylist) togglePlaylist.textContent = LABELS_PLAYLIST.BTN_TOGGLE_PLAYLIST;
    const toggleNav = document.querySelector('[data-label="toggle_nav"]');
    if (toggleNav) toggleNav.textContent = LABELS_PLAYLIST.BTN_TOGGLE_NAV;
    const headerTitle = document.querySelector('[data-label="header_title"]');
    if (headerTitle && LABELS_PLAYLIST.LABEL_HEADER_TITLE) headerTitle.textContent = LABELS_PLAYLIST.LABEL_HEADER_TITLE;
    const btnNouveautes = document.querySelector('[data-label="btn_nouveautes"]');
    if (btnNouveautes && LABELS_PLAYLIST.BTN_NOUVEAUTES) btnNouveautes.textContent = LABELS_PLAYLIST.BTN_NOUVEAUTES;
    const btnRechercher = document.querySelector('[data-label="btn_rechercher"]');
    if (btnRechercher && LABELS_PLAYLIST.BTN_RECHERCHER) btnRechercher.textContent = LABELS_PLAYLIST.BTN_RECHERCHER;
    const btnScrapper = document.querySelector('[data-label="btn_scrapper"]');
    if (btnScrapper && LABELS_PLAYLIST.BTN_SCRAPPER) btnScrapper.textContent = LABELS_PLAYLIST.BTN_SCRAPPER;
    const modNouveautesTitle = document.querySelector('[data-label="mod_nouveautes_title"]');
    if (modNouveautesTitle && LABELS_PLAYLIST.MOD_NOUVEAUTES_TITLE) modNouveautesTitle.textContent = LABELS_PLAYLIST.MOD_NOUVEAUTES_TITLE;
    const modRechercherTitle = document.querySelector('[data-label="mod_rechercher_title"]');
    if (modRechercherTitle && LABELS_PLAYLIST.MOD_RECHERCHER_TITLE) modRechercherTitle.textContent = LABELS_PLAYLIST.MOD_RECHERCHER_TITLE;
    const modScrapperTitle = document.querySelector('[data-label="mod_scrapper_title"]');
    if (modScrapperTitle && LABELS_PLAYLIST.MOD_SCRAPPER_TITLE) modScrapperTitle.textContent = LABELS_PLAYLIST.MOD_SCRAPPER_TITLE;
    const searchPlaceholder = document.querySelector('[data-label="search_placeholder"]');
    if (searchPlaceholder && LABELS_PLAYLIST.LABEL_SEARCH_PLACEHOLDER) searchPlaceholder.placeholder = LABELS_PLAYLIST.LABEL_SEARCH_PLACEHOLDER;
    const optArtist = document.querySelector('[data-label="opt_artist"]');
    if (optArtist && LABELS_PLAYLIST.LABEL_OPT_ARTIST) optArtist.textContent = LABELS_PLAYLIST.LABEL_OPT_ARTIST;
    const optAlbum = document.querySelector('[data-label="opt_album"]');
    if (optAlbum && LABELS_PLAYLIST.LABEL_OPT_ALBUM) optAlbum.textContent = LABELS_PLAYLIST.LABEL_OPT_ALBUM;
    const optTitle = document.querySelector('[data-label="opt_title"]');
    if (optTitle && LABELS_PLAYLIST.LABEL_OPT_TITLE) optTitle.textContent = LABELS_PLAYLIST.LABEL_OPT_TITLE;

    // Tooltips
    const titles = {
        'headerBackBtn': LABELS_PLAYLIST.TOOLTIP_BACK,
        'toggleNavSidebar': LABELS_PLAYLIST.TOOLTIP_TOGGLE_NAV,
        'togglePlaylistSidebar': LABELS_PLAYLIST.TOOLTIP_TOGGLE_PLAYLIST,
        'btnNouveautes': LABELS_PLAYLIST.TOOLTIP_NOUVEAUTES,
        'btnRechercher': LABELS_PLAYLIST.TOOLTIP_RECHERCHER,
        'btnScrapper': LABELS_PLAYLIST.TOOLTIP_SCRAPPER,
        'expandAllBtn': LABELS_PLAYLIST.TOOLTIP_EXPAND_ALL,
        'collapseAllBtn': LABELS_PLAYLIST.TOOLTIP_COLLAPSE_ALL,
        'shuffleBtn': LABELS_PLAYLIST.TOOLTIP_SHUFFLE
    };
    Object.entries(titles).forEach(([id, title]) => {
        const el = document.getElementById(id);
        if (el) el.title = title;
    });
    document.querySelectorAll('.prev-btn').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_PREV);
    document.querySelectorAll('.next-btn').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_NEXT);
    document.querySelectorAll('.restart-btn').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_RESTART);
    document.querySelectorAll('.play-pause-btn').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_PLAY_PAUSE);
    document.querySelectorAll('.clear-search').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_CLEAR_SEARCH);
    document.querySelectorAll('.clear-search-modal').forEach(el => el.title = LABELS_PLAYLIST.TOOLTIP_CLEAR_SEARCH);
}

// ============ APPLICATION PRINCIPALE ============
class App {
    constructor() {
        this.currentPath = '';
        this.selectedFile = '';
        this.tree = null;
        this.playlistUI = null;
        this.recent = null;
        this.search = null;
        this.scrapper = null;
        this.radio = null;
        this._loading = true;  // Mode silencieux pendant le chargement
    }

    /**
     * Affiche une notification uniquement si l'application n'est pas en phase de chargement initial.
     */
    _notify(msg, type) {
        if (!this._loading) {
            showNotification(msg, type);
        }
    }

    /**
     * Met à jour l'affichage du titre de la vidéo en cours.
     * @param {Object} video
     */
    updateVideoTitle(video) {
        const topTitle = document.getElementById('videoTitleTop');
        if (!topTitle || !video) return;

        topTitle.replaceChildren();

        const artistRow = document.createElement('span');
        artistRow.className = 'video-info-row';
        const artistLabel = document.createElement('span');
        artistLabel.className = 'video-info-label';
        artistLabel.textContent = LABELS_PLAYLIST.LABEL_ARTISTE + ' :';
        const artistValue = document.createElement('span');
        artistValue.className = 'video-info-value';
        artistValue.textContent = video.artist || '';
        artistRow.appendChild(artistLabel);
        artistRow.appendChild(document.createTextNode(' '));
        artistRow.appendChild(artistValue);
        topTitle.appendChild(artistRow);

        const titleRow = document.createElement('span');
        titleRow.className = 'video-info-row';
        const titleLabel = document.createElement('span');
        titleLabel.className = 'video-info-label';
        titleLabel.textContent = LABELS_PLAYLIST.LABEL_TITRE + ' :';
        const titleValue = document.createElement('span');
        titleValue.className = 'video-info-value';
        titleValue.textContent = video.song_title || '';
        titleRow.appendChild(titleLabel);
        titleRow.appendChild(document.createTextNode(' '));
        titleRow.appendChild(titleValue);
        topTitle.appendChild(titleRow);

        if (video.album && video.album !== 'Inconnu') {
            const albumRow = document.createElement('span');
            albumRow.className = 'video-info-row';
            const albumLabel = document.createElement('span');
            albumLabel.className = 'video-info-label';
            albumLabel.textContent = LABELS_PLAYLIST.LABEL_ALBUM + ' :';
            const albumValue = document.createElement('span');
            albumValue.className = 'video-info-value';
            albumValue.textContent = video.album;
            albumRow.appendChild(albumLabel);
            albumRow.appendChild(document.createTextNode(' '));
            albumRow.appendChild(albumValue);
            topTitle.appendChild(albumRow);
        }
    }

    /**
     * Initialise l'application : services, composants, événements.
     */
    init() {
        initLabels();
        initLayoutToggles();
        initNotifications();

        // Services partagés
        const api = new ApiService();
        const player = new Player();
        const playlist = new Playlist();

        this.player = player;
        this.playlist = playlist;

        // Mise à jour du titre de la vidéo à chaque changement d'index
        playlist.addEventListener('change', () => {
            const video = playlist.getCurrentVideo();
            if (video) {
                this.updateVideoTitle(video);
            }
        });

        // Références DOM pour les composants
        const dom = {
            // Arborescence
            treeContainer: document.getElementById('folderTree'),
            // Playlist UI
            playlistContainer: document.getElementById('videoPlaylist'),
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            playlistCount: document.getElementById('playlistCount'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            // Modales
            recentOverlay: document.getElementById('mod-nouveautes'),
            recentContent: document.getElementById('mod-nouveaute-app'),
            recentCloseBtn: document.getElementById('modNouveautesClose'),
            searchOverlay: document.getElementById('mod-rechercher'),
            searchContent: document.getElementById('mod-rechercher-app'),
            searchCloseBtn: document.getElementById('modRechercherClose'),
            scrapperOverlay: document.getElementById('mod-scrapper'),
            scrapperContent: document.getElementById('mod-scrapper-app'),
            scrapperCloseBtn: document.getElementById('modScrapperClose'),
            radioOverlay: document.getElementById('mod-radio'),
            radioContent: document.getElementById('mod-radio-app'),
            radioCloseBtn: document.getElementById('modRadioClose')
        };

        // Arborescence
        this.tree = new TreeComponent({
            api,
            notify: (msg, type) => this._notify(msg, type),
            treeContainer: dom.treeContainer
        });
        this.tree.addEventListener('select', (e) => {
            this.handleTreeSelect(e.detail.file, e.detail.path);
        });
        this.tree.addEventListener('add-file', (e) => {
            this.handleAddFile(e.detail.file, e.detail.path);
        });
        this.tree.addEventListener('add-folder', (e) => {
            this.handleAddFolder(e.detail.folder, e.detail.folderPath);
        });
        this.tree.bindContextMenuActions();

        // Playlist UI
        this.playlistUI = new PlaylistUIComponent({
            playlist,
            notify: (msg, type) => this._notify(msg, type),
            dom: {
                playlistContainer: dom.playlistContainer,
                searchInput: dom.searchInput,
                clearSearch: dom.clearSearch,
                playlistCount: dom.playlistCount,
                shuffleBtn: dom.shuffleBtn
            }
        });
        this.playlistUI.addEventListener('play-track', (e) => {
            const { video } = e.detail;
            if (video) {
                player.loadVideoById(video.id);
                this.updateVideoTitle(video); // mise à jour titre lors du clic
            }
        });

        // Modale Nouveautés
        this.recent = new RecentComponent({
            api,
            notify: (msg, type) => this._notify(msg, type),
            dom: {
                modalOverlay: dom.recentOverlay,
                modalContent: dom.recentContent,
                closeBtn: dom.recentCloseBtn
            }
        });
        this.recent.addEventListener('select-file', (e) => {
            this.handleSelectFileFromModal(e.detail.file, e.detail.path);
        });

        // Modale Rechercher
        this.search = new SearchComponent({
            api,
            notify: (msg, type) => this._notify(msg, type),
            dom: {
                modalOverlay: dom.searchOverlay,
                modalContent: dom.searchContent,
                closeBtn: dom.searchCloseBtn
            }
        });
        this.search.addEventListener('select-file', (e) => {
            this.handleSelectFileFromModal(e.detail.file, e.detail.path);
        });

        // Modale Scrapper
        this.scrapper = new ScrapperComponent({
            api,
            notify: (msg, type) => this._notify(msg, type),
            dom: {
                modalOverlay: dom.scrapperOverlay,
                modalContent: dom.scrapperContent,
                closeBtn: dom.scrapperCloseBtn
            }
        });

        // Modale Radio
        this.radio = new RadioComponent({
            api,
            playlist,
            player,
            notify: (msg, type) => this._notify(msg, type),
            dom: {
                modalOverlay: dom.radioOverlay,
                modalContent: dom.radioContent,
                closeBtn: dom.radioCloseBtn
            }
        });

        // Événements du lecteur
        player.addEventListener('stateChange', (e) => {
            if (e.detail.state === 'ended') {
                playlist.nextIndex();
                const nextVideo = playlist.getCurrentVideo();
                if (nextVideo) {
                    player.loadVideoById(nextVideo.id);
                }
            }
            this.updatePlayPauseUI();
        });
    player.addEventListener('error', (e) => {
      // Gestion timeout API YouTube
      if (e.detail?.code === 'API_TIMEOUT') {
        this._notify('Le lecteur YouTube n\'a pas pu etre charge. Verifiez votre connexion.', 'error');
        return;
      }
      const currentVideo = playlist.getCurrentVideo();
      if (currentVideo) {
        playlist.markUnavailable(currentVideo.id);
      }
      this._notify(LABELS_PLAYLIST.MSG_VIDEO_UNAVAILABLE, 'error');
      // Passer au suivant automatiquement apres erreur
      setTimeout(() => {
        playlist.nextIndex();
        const nextVideo = playlist.getCurrentVideo();
        if (nextVideo) player.loadVideoById(nextVideo.id);
      }, 2000);
    });
        player.addEventListener('ready', () => {
            // Le lecteur est prêt, on peut éventuellement lancer la lecture si une playlist est déjà définie
        });

        // Contrôles du lecteur (boutons prev/next/restart/play-pause)
        document.querySelectorAll('.prev-btn').forEach(btn => btn.addEventListener('click', () => {
            playlist.prevIndex();
            const video = playlist.getCurrentVideo();
            if (video) {
                player.loadVideoById(video.id);
                this.updateVideoTitle(video);
            }
            this._notify(LABELS_PLAYLIST.TOAST_PLAY_PREV, 'success');
        }));
        document.querySelectorAll('.next-btn').forEach(btn => btn.addEventListener('click', () => {
            playlist.nextIndex();
            const video = playlist.getCurrentVideo();
            if (video) {
                player.loadVideoById(video.id);
                this.updateVideoTitle(video);
            }
            this._notify(LABELS_PLAYLIST.TOAST_PLAY_NEXT, 'success');
        }));
        document.querySelectorAll('.restart-btn').forEach(btn => btn.addEventListener('click', () => {
            player.restart();
            this._notify(LABELS_PLAYLIST.TOAST_RESTART, 'success');
        }));
        document.querySelectorAll('.play-pause-btn').forEach(btn => btn.addEventListener('click', () => {
            player.togglePlayPause();
            this._notify(player.isPlaying ? LABELS_PLAYLIST.TOAST_PLAY : LABELS_PLAYLIST.TOAST_PAUSE, 'success');
        }));

        // Boutons du header
        document.getElementById('btnNouveautes')?.addEventListener('click', () => this.recent.open());
        document.getElementById('btnRechercher')?.addEventListener('click', () => this.search.open());
        document.getElementById('btnScrapper')?.addEventListener('click', () => this.scrapper.open());
        document.getElementById('btnRadio')?.addEventListener('click', () => this.radio.open());
        document.getElementById('headerBackBtn')?.addEventListener('click', () => {
            window.location.href = LABELS_PLAYLIST.URL_HOME;
        });
        document.getElementById('expandAllBtn')?.addEventListener('click', () => this.tree.expandAllFolders());
        document.getElementById('collapseAllBtn')?.addEventListener('click', () => this.tree.collapseAllFolders());

        // Navigation SPA
        window.addEventListener('popstate', () => this.loadFromUrl());

        // Initialisation du lecteur YouTube différée
        player.setContainer('youtubePlayer');

        // Chargement de l'état initial, et une fois terminé on autorise les notifications
        this.loadInitialState().finally(() => {
            this._loading = false;
        });
    }

    /**
     * Charge l'état initial en fonction des paramètres d'URL.
     */
    async loadInitialState() {
        const params = new URLSearchParams(window.location.search);
        this.currentPath = params.get('path') || '';
        this.selectedFile = params.get('file') || '';
        const csvPath = params.get('csvPath') || '';

        await this.tree.init();

        if (this.selectedFile) {
            await this.loadPlaylist(this.selectedFile, csvPath || this.currentPath);
        }
    }

    /**
     * Charge une playlist à partir d'un fichier et d'un chemin.
     * @param {string} file
     * @param {string} path
     */
    async loadPlaylist(file, path) {
        try {
            const data = await (new ApiService()).fetchPlaylist(file, path);
            if (!data || data.success === false) {
                throw new Error(data?.error || 'Erreur de chargement');
            }
            this.selectedFile = file;
            this.currentPath = path;
            this.playlist.setVideos(data.videos || []);
            this.updateEmptyState(false);
            // Lancer la lecture du premier titre (déclenchera l'init différée du player)
            const firstVideo = this.playlist.getCurrentVideo();
            if (firstVideo) {
                this.player.loadVideoById(firstVideo.id);
                this.updateVideoTitle(firstVideo); // mise à jour immédiate du titre
            }
        } catch (error) {
            this._notify(error.message, 'error');
        }
    }

    /**
     * Réagit à la sélection d'un fichier dans l'arborescence.
     * @param {string} file
     * @param {string} path
     */
    handleTreeSelect(file, path) {
        this.collapseAndExpandToPath(path).then(() => {
            this.updateUrl(file, path);
            this.loadPlaylist(file, path);
        });
    }

    /**
     * Gère l'ajout d'un fichier via le menu contextuel.
     * @param {string} file
     * @param {string} path
     */
    async handleAddFile(file, path) {
        try {
            const data = await (new ApiService()).fetchPlaylist(file, path);
            if (!data || !data.videos || data.videos.length === 0) {
                this._notify(LABELS_PLAYLIST.MSG_ERROR_DATA, 'error');
                return;
            }
            const wasEmpty = this.playlist.totalCount === 0;
            this.playlist.addVideos(data.videos);
            this._notify(`${data.videos.length} titre(s) ajouté(s)`, 'success');
            if (wasEmpty) {
                this.updateEmptyState(false);
                const firstVideo = this.playlist.getCurrentVideo();
                if (firstVideo) {
                    this.player.loadVideoById(firstVideo.id);
                    this.updateVideoTitle(firstVideo);
                }
            }
        } catch (error) {
            this._notify(error.message, 'error');
        }
    }

    /**
     * Gère l'ajout de tous les CSV d'un dossier via le menu contextuel.
     * @param {string} folder
     * @param {string} folderPath
     */
    async handleAddFolder(folder, folderPath) {
        try {
            const api = new ApiService();
            const scanData = await api.fetchScan(folderPath);
            if (!scanData || !scanData.files || scanData.files.length === 0) {
                this._notify(LABELS_PLAYLIST.MSG_ERROR_EMPTY_FOLDER, 'error');
                return;
            }
            const fetchPromises = scanData.files.map(file => api.fetchPlaylist(file, folderPath));
            const results = await Promise.all(fetchPromises);
            let allVideos = [];
            results.forEach(data => {
                if (data && data.videos) {
                    allVideos = [...allVideos, ...data.videos];
                }
            });
            if (allVideos.length === 0) {
                this._notify(LABELS_PLAYLIST.MSG_ERROR_DATA, 'error');
                return;
            }
            const wasEmpty = this.playlist.totalCount === 0;
            this.playlist.addVideos(allVideos);
            this._notify(`${allVideos.length} titre(s) ajouté(s)`, 'success');
            if (wasEmpty) {
                this.updateEmptyState(false);
                const firstVideo = this.playlist.getCurrentVideo();
                if (firstVideo) {
                    this.player.loadVideoById(firstVideo.id);
                    this.updateVideoTitle(firstVideo);
                }
            }
        } catch (error) {
            this._notify(error.message, 'error');
        }
    }

    /**
     * Méthode appelée depuis les modales Nouveautés/Recherche pour charger un fichier.
     */
    handleSelectFileFromModal(file, path) {
        this.collapseAndExpandToPath(path).then(() => {
            this.updateUrl(file, path);
            this.loadPlaylist(file, path);
        });
    }

    /**
     * Met à jour l'URL sans rechargement (pushState).
     */
    updateUrl(file, path) {
        const params = new URLSearchParams();
        if (path) params.set('csvPath', path);
        if (file) params.set('file', file);
        const url = params.toString() ? '?' + params.toString() : window.location.pathname;
        history.pushState({}, '', url);
    }

    /**
     * Replie tout et déplie jusqu'au chemin donné.
     */
    async collapseAndExpandToPath(path) {
        this.tree.collapseAllFolders();
        await this.tree.expandToPath(path);
    }

    /**
     * Charge l'état depuis l'URL (popstate).
     */
    loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const file = params.get('file');
        const csvPath = params.get('csvPath') || '';
        if (file) {
            this.loadPlaylist(file, csvPath);
        }
    }

    /**
     * Affiche ou masque l'état vide (player).
     */
    updateEmptyState(isEmpty) {
        const playerArea = document.getElementById('youtubePlayer')?.parentElement;
        if (playerArea) playerArea.style.display = isEmpty ? 'none' : 'flex';
        const playlistSidebar = document.getElementById('playlistSidebar');
        if (playlistSidebar) playlistSidebar.style.display = isEmpty ? 'none' : 'flex';
    }

    /**
     * Met à jour l'UI des boutons play/pause.
     */
    updatePlayPauseUI() {
        const text = this.player.isPlaying ? LABELS_PLAYLIST.BTN_PAUSE : LABELS_PLAYLIST.BTN_PLAY;
        document.querySelectorAll('.play-pause-btn').forEach(btn => btn.textContent = text);
    }
}

// ============ DÉMARRAGE ============
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
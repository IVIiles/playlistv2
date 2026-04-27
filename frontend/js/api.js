// ============ API SERVICE ============

import { buildApiUrl, fetchJson } from './utils.js';

const API_BASE = 'backend/api.php';
const SCRAPPER_BASE = 'backend/scrapper.php';

export class ApiService {
    /**
     * Scan d'un dossier.
     * @param {string} path - Chemin relatif
     * @returns {Promise<Object>}
     */
    async fetchScan(path) {
        const url = buildApiUrl('scan', { path }, API_BASE);
        return fetchJson(url);
    }

    /**
     * Scan récursif de l'arborescence.
     * @param {number} [depth] - Profondeur
     * @returns {Promise<Object>}
     */
    async fetchScanRecursive(depth) {
        const params = depth !== undefined ? { depth } : {};
        const url = buildApiUrl('scanRecursive', params, API_BASE);
        return fetchJson(url);
    }

    /**
     * Charge une playlist (vidéos d'un CSV).
     * @param {string} file - Nom du fichier
     * @param {string} path - Chemin du dossier
     * @returns {Promise<Object>}
     */
    async fetchPlaylist(file, path) {
        const url = buildApiUrl('playlist', { file, path }, API_BASE);
        return fetchJson(url);
    }

    /**
     * Récupère la liste des fichiers récents.
     * @returns {Promise<Object>}
     */
    async fetchRecent() {
        const url = buildApiUrl('recent', {}, API_BASE);
        return fetchJson(url);
    }

    /**
     * Recherche dans les CSV.
     * @param {string} query - Terme de recherche
     * @param {string[]} fields - Champs (artist, album, title)
     * @returns {Promise<Object>}
     */
    async fetchSearch(query, fields) {
        const url = buildApiUrl('search', { q: query, fields: fields.join(',') }, API_BASE);
        return fetchJson(url);
    }

    /**
     * Génère une playlist radio.
     * @param {number} count - Nombre de titres
     * @param {string[]} folders - Chemins des dossiers
     * @returns {Promise<Object>}
     */
    async fetchRadio(count, folders) {
        const url = buildApiUrl('radio', { count, folders: folders.join(',') }, API_BASE);
        return fetchJson(url);
    }

    /**
     * Scrape une playlist YouTube.
     * @param {string} youtubeUrl - URL de la playlist
     * @returns {Promise<Object>}
     */
    async fetchScrape(youtubeUrl) {
        const url = buildApiUrl('scrape', { url: youtubeUrl }, SCRAPPER_BASE);
        return fetchJson(url);
    }
}
// ============ UTILITAIRES ============

/**
 * Échappe les caractères HTML spéciaux pour prévenir les injections XSS.
 * @param {*} text - Valeur à échapper
 * @returns {string} Chaîne sécurisée
 */
export function escapeHtml(text) {
    if (text == null) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Construit une URL d'API avec les paramètres indiqués.
 * @param {string} action - Action demandée
 * @param {Object} [params={}] - Paramètres additionnels
 * @param {string} [base=API_BASE] - URL de base de l'API (optionnelle)
 * @returns {string} URL complète
 */
export function buildApiUrl(action, params = {}, base = 'backend/api.php') {
    const url = new URL(base, window.location.href);
    url.searchParams.set('action', action);
    for (const [key, value] of Object.entries(params)) {
        if (value !== '') {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

/**
 * Effectue une requête fetch et retourne la réponse JSON.
 * @param {string} url - URL cible
 * @returns {Promise<any>} Données JSON
 * @throws {Error} Si le réseau échoue ou si la réponse n'est pas OK
 */
export async function fetchJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Limite la fréquence d'appel d'une fonction (debounce).
 * @param {Function} func - Fonction à différer
 * @param {number} wait - Délai en millisecondes
 * @returns {Function} Fonction debounced
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
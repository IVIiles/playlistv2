// ============ LAYOUT ============
// Gère l'affichage/masquage des sidebars

/**
 * Initialise les boutons de toggle pour les sidebars.
 */
export function initLayoutToggles() {
    toggleSidebar('togglePlaylistSidebar', 'playlistSidebar');
    toggleSidebar('toggleNavSidebar', 'navSidebar');
}

/**
 * Attache un écouteur de clic à un bouton pour basculer une sidebar.
 * @param {string} btnId - ID du bouton
 * @param {string} sidebarId - ID de la sidebar
 */
function toggleSidebar(btnId, sidebarId) {
    const btn = document.getElementById(btnId);
    const sidebar = document.getElementById(sidebarId);
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        btn.classList.toggle('active');
        btn.style.opacity = sidebar.classList.contains('collapsed') ? '0.7' : '1';
    });
}
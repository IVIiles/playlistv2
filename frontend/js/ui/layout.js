// ============ LAYOUT ============
// Gère l'affichage/masquage des sidebars et navigation mobile par onglets

/**
 * Initialise les boutons de toggle pour les sidebars.
 */
export function initLayoutToggles() {
    toggleSidebar('togglePlaylistSidebar', 'playlistSidebar');
    toggleSidebar('toggleNavSidebar', 'navSidebar');
    
    // Support tactile : swipe gauche/droite pour ouvrir/fermer sidebars
    initSwipeGestures();
    
    // Système d'onglets pour mobile
    initMobileTabs();
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

/**
 * Initialise le système d'onglets pour mobile.
 * Permet de naviguer entre Navigation, Vidéo et Playlist sur petits écrans.
 */
function initMobileTabs() {
    const tabButtons = document.querySelectorAll('.mobile-tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            
            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            
            // Masquer toutes les vues
            document.querySelectorAll('.navigation-bar, .playlist-container, .video-container').forEach(view => {
                view.classList.remove('active-view');
            });
            
            // Afficher la vue cible
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active-view');
                
                // Scroll to top quand on change d'onglet
                window.scrollTo(0, 0);
            }
        });
    });
    
    // Initialiser la première vue active (Navigation par défaut)
    const firstTab = document.querySelector('.mobile-tab-btn.active');
    if (firstTab && window.innerWidth <= 900) {
        const targetId = firstTab.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active-view');
        }
    }
    
    // Gérer le redimensionnement fenêtre
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            handleResponsiveLayout();
        }, 250);
    });
    
    // Initial check
    handleResponsiveLayout();
}

/**
 * Gère l'adaptation du layout selon la taille d'écran.
 * Réinitialise les états quand on passe de mobile à desktop.
 */
function handleResponsiveLayout() {
    const isMobile = window.innerWidth <= 900;
    const navSidebar = document.getElementById('navSidebar');
    const playlistSidebar = document.getElementById('playlistSidebar');
    const videoContainer = document.getElementById('videoContainer');
    
    if (!isMobile) {
        // Mode desktop : réafficher tout et reset les classes actives
        navSidebar?.classList.remove('active-view');
        playlistSidebar?.classList.remove('active-view');
        videoContainer?.classList.remove('active-view');
        
        // Reset des onglets actifs
        document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Réafficher header desktop
        document.getElementById('playlist-header').style.display = '';
    } else {
        // Mode mobile : s'assurer qu'un onglet est actif
        const activeTab = document.querySelector('.mobile-tab-btn.active');
        if (!activeTab) {
            // Activer le premier onglet par défaut
            const firstTab = document.querySelector('.mobile-tab-btn');
            if (firstTab) {
                firstTab.click();
            }
        }
    }
}

/**
 * Initialise les gestes tactiles (swipe) pour mobile.
 */
function initSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50; // Distance minimale pour valider le swipe
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const navSidebar = document.getElementById('navSidebar');
        const playlistSidebar = document.getElementById('playlistSidebar');
        const videoContainer = document.getElementById('videoContainer');
        
        // Sur mobile avec onglets, le swipe change d'onglet
        if (window.innerWidth <= 900) {
            const tabs = document.querySelectorAll('.mobile-tab-btn');
            const currentTab = document.querySelector('.mobile-tab-btn.active');
            const currentIndex = Array.from(tabs).indexOf(currentTab);
            
            // Swipe vers la droite : onglet précédent
            if (swipeDistance > minSwipeDistance && currentIndex > 0) {
                tabs[currentIndex - 1].click();
            }
            
            // Swipe vers la gauche : onglet suivant
            if (swipeDistance < -minSwipeDistance && currentIndex < tabs.length - 1) {
                tabs[currentIndex + 1].click();
            }
        } else {
            // Sur desktop/tablette sans onglets, swipe ouvre/ferme sidebars
            if (swipeDistance > minSwipeDistance) {
                if (navSidebar && navSidebar.classList.contains('collapsed')) {
                    navSidebar.classList.remove('collapsed');
                    document.getElementById('toggleNavSidebar').style.opacity = '1';
                }
            }
            
            if (swipeDistance < -minSwipeDistance) {
                if (playlistSidebar && playlistSidebar.classList.contains('collapsed')) {
                    playlistSidebar.classList.remove('collapsed');
                    document.getElementById('togglePlaylistSidebar').style.opacity = '1';
                }
            }
        }
    }
}
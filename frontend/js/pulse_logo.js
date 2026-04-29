/* ============================================
FORMAT DESCRIPTIF - Trigger → Input → Action → Result
=====================
- Trigger : Événements du player YouTube (play/pause)
- Input : playBtn, backBtn, player
- Action : Écoute les changements d'état du player
- Result : Active/Désactive l'animation pulse sur le bouton retour
============================================ */

(function() {
    // --- PARTIE CSS (Inchangée) ---
    const style = document.createElement('style');
    style.textContent = `
        @keyframes dance-pulse {
            0% { transform: scale(1) rotate(0deg); box-shadow: 0 0 0 0 rgba(0, 234, 255, 0.7); }
            25% { transform: scale(1.1) rotate(-10deg); box-shadow: 0 0 15px 5px rgba(0, 234, 255, 0.5); }
            50% { transform: scale(1) rotate(0deg); box-shadow: 0 0 0 0 rgba(0, 234, 255, 0.7); }
            75% { transform: scale(1.1) rotate(10deg); box-shadow: 0 0 15px 5px rgba(0, 234, 255, 0.5); }
            100% { transform: scale(1) rotate(0deg); box-shadow: 0 0 0 0 rgba(0, 234, 255, 0.7); }
        }
        #playlist-app .header-back-btn.pulse-active {
            animation: dance-pulse 2s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);

    // --- LOGIQUE D'ANIMATION EVENT-BASED ---
    
    let isPulsing = false;
    let pulseAnimationId = null;
    
    function getElements() {
        return {
            playBtn: document.querySelector('.play-pause-btn'),
            backBtn: document.getElementById('headerBackBtn'),
            player: document.getElementById('youtubePlayer')
        };
    }
    
    function startPulse() {
        const { backBtn } = getElements();
        if (!backBtn || isPulsing) return;
        
        isPulsing = true;
        backBtn.classList.add('pulse-active');
        
        // Animation avec requestAnimationFrame au lieu de setInterval
        const animate = () => {
            if (!isPulsing) return;
            pulseAnimationId = requestAnimationFrame(animate);
        };
        pulseAnimationId = requestAnimationFrame(animate);
    }
    
    function stopPulse() {
        const { backBtn } = getElements();
        if (!backBtn) return;
        
        isPulsing = false;
        backBtn.classList.remove('pulse-active');
        
        if (pulseAnimationId) {
            cancelAnimationFrame(pulseAnimationId);
            pulseAnimationId = null;
        }
    }
    
    function updatePulseState() {
        const { playBtn, player } = getElements();
        
        if (!playBtn || !player) {
            stopPulse();
            return;
        }
        
        // Vérifier présence vidéo
        const hasVideo = player.tagName === 'IFRAME' || player.querySelector('iframe');
        
        // Vérifier état lecture
        const isPlaying = playBtn.textContent.includes('⏸');
        
        if (hasVideo && isPlaying) {
            startPulse();
        } else {
            stopPulse();
        }
    }
    
    // --- OBSERVATION DES CHANGEMENTS ---
    
    // Observer les changements du bouton play/pause
    function observePlayButton() {
        const { playBtn } = getElements();
        if (!playBtn) return;
        
        const observer = new MutationObserver(() => {
            updatePulseState();
        });
        
        observer.observe(playBtn, {
            childList: true,
            characterData: true,
            subtree: true
        });
        
        // Observer aussi le player pour les changements d'iframe
        const { player } = getElements();
        if (player) {
            const playerObserver = new MutationObserver(() => {
                updatePulseState();
            });
            playerObserver.observe(player, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // --- INITIALISATION ---
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updatePulseState();
            observePlayButton();
        });
    } else {
        updatePulseState();
        observePlayButton();
    }
    
    // Mettre à jour périodiquement mais moins fréquemment (3s au lieu de 1s)
    // C'est une solution de secours, l'observer Mutation devrait suffire
    setInterval(updatePulseState, 3000);
})();
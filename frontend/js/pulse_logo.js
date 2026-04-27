/* ============================================
   FORMAT DESCRIPTIF - Trigger → Input → Action → Result
   =====================
   - Trigger : auto (200ms)
   - Input   : playBtn, backBtn, player
   - Action  : Vérifie la présence d'une iframe ET l'état "pause" du bouton
   - Result  : Active/Désactive l'animation pulse sur le bouton retour
   ============================================ */

(function() {
    // --- PARTIE CSS (Inchangée selon vos instructions) ---
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
            animation: dance-pulse 2s ease-in-out infinite;  //0,8 a la base
        }
    `;
    document.head.appendChild(style);

    // --- LOGIQUE D'ANIMATION ---
    
    // On cherche les éléments une seule fois (si possible) ou on les valide proprement
    setInterval(() => {
        const playBtn = document.querySelector('.play-pause-btn');
        const backBtn = document.getElementById('headerBackBtn');
        const player = document.getElementById('youtubePlayer');

        if (!playBtn || !backBtn || !player) return;

        // 1. Logique simplifiée pour la présence d'une vidéo
        const hasVideo = player.tagName === 'IFRAME' || player.querySelector('iframe');
        
        // 2. Logique pour l'état de lecture
        // Note : On utilise .includes pour éviter les problèmes d'espaces invisibles
        const isPlaying = playBtn.textContent.includes('⏸');

        // 3. Application du résultat : On ajoute la classe seulement si (Vidéo Présente) ET (En lecture)
        if (hasVideo && isPlaying) {
            backBtn.classList.add('pulse-active');
        } else {
            // Si la vidéo est en pause OU que l'iframe a disparu, on retire l'animation
            backBtn.classList.remove('pulse-active');
        }
    }, 1000); //200
})();
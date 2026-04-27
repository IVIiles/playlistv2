// ============ PLAYER (CORE) ============
// Encapsule le lecteur YouTube, ses événements et ses contrôles.
// L'initialisation est différée jusqu'au premier loadVideoById.

export class Player extends EventTarget {
    constructor() {
        super();
    this.ytPlayer = null;
    this.isPlaying = false;
    this.currentVideoId = null;
    this.ready = false;
        this.containerId = null;
    }

    /**
     * Définit le conteneur où le lecteur YouTube sera injecté.
     * @param {string} containerId - ID de l'élément HTML
     */
    setContainer(containerId) {
        this.containerId = containerId;
    }

    /**
     * Initialise le lecteur YouTube (appelé automatiquement au premier loadVideoById).
     * @private
     */
    _init() {
        if (!this.containerId || !document.getElementById(this.containerId)) {
            console.error(`Player: container #${this.containerId} introuvable`);
            return;
        }

        if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
            try { this.ytPlayer.destroy(); } catch (e) {}
            this.ytPlayer = null;
        }
        this.ready = false;

        const create = () => {
            this.ytPlayer = new window.YT.Player(this.containerId, {
                height: '100%',
                width: '100%',
                playerVars: {
                    'autoplay': 1,
                    'rel': 0,
                    'enablejsapi': 1
                },
                events: {
                    'onReady': (event) => {
                        this.ytPlayer = event.target;
                        this.ready = true;
                        this.dispatchEvent(new Event('ready'));
                    },
                    'onStateChange': (event) => this._handleStateChange(event.data),
                    'onError': (event) => this._handleError(event.data)
                }
            });
        };

    if (window.YT && window.YT.Player) {
      create();
    } else {
      window.onYouTubeIframeAPIReady = () => create();
    }

    // Timeout API YouTube (10 secondes)
    setTimeout(() => {
      if (!this.ready && !this.ytPlayer) {
        console.error('Player: Timeout API YouTube');
        this.dispatchEvent(new CustomEvent('error', {
          detail: { code: 'API_TIMEOUT', message: 'API YouTube non disponible' }
        }));
      }
    }, 10000);
  }

  /**
   * Charge une video par son ID YouTube. Initialise le lecteur si necessaire.
   * @param {string} videoId
   */
  loadVideoById(videoId) {
        if (!this.ytPlayer || !this.ready) {
            if (!this.containerId) return;
            this._init();
            const onReady = () => {
                this.removeEventListener('ready', onReady);
                this._load(videoId);
            };
            this.addEventListener('ready', onReady);
        } else {
            this._load(videoId);
        }
    }

    /**
     * Charge effectivement la vidéo dans le lecteur.
     * @param {string} videoId
     */
  _load(videoId) {
    this.currentVideoId = videoId;
    this.ytPlayer.loadVideoById(videoId);
    this.isPlaying = true;
  }

    play() {
        if (this.ytPlayer && this.ready) {
            this.ytPlayer.playVideo();
            this.isPlaying = true;
            this._emitStateChange();
        }
    }

    pause() {
        if (this.ytPlayer && this.ready) {
            this.ytPlayer.pauseVideo();
            this.isPlaying = false;
            this._emitStateChange();
        }
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    restart() {
        if (this.ytPlayer && this.ready && typeof this.ytPlayer.seekTo === 'function') {
            this.ytPlayer.seekTo(0);
            this.play();
        }
    }

  destroy() {
    if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
      try { this.ytPlayer.destroy(); } catch (e) {}
    }
    this.ytPlayer = null;
    this.ready = false;
    this.currentVideoId = null;
  }

    stop() {
        if (this.ytPlayer && this.ready) {
            this.ytPlayer.stopVideo();
            this.isPlaying = false;
            this._emitStateChange();
        }
    }

    setVolume(volume) {
        if (this.ytPlayer && this.ready && typeof this.ytPlayer.setVolume === 'function') {
            this.ytPlayer.setVolume(volume);
        }
    }

  _handleStateChange(state) {
    if (state === 0) {
      this.isPlaying = false;
      this.dispatchEvent(new CustomEvent('stateChange', { detail: { state: 'ended' } }));
    } else if (state === 1) {
      this.isPlaying = true;
      this.dispatchEvent(new CustomEvent('stateChange', { detail: { state: 'playing' } }));
    } else if (state === 2) {
      this.isPlaying = false;
      this.dispatchEvent(new CustomEvent('stateChange', { detail: { state: 'paused' } }));
    }
  }

  _handleError(errorCode) {
    console.error(`Player error: ${errorCode}`);
    this.dispatchEvent(new CustomEvent('error', { detail: { code: errorCode } }));
  }

  _emitStateChange() {
    this.dispatchEvent(new CustomEvent('stateChange', {
      detail: { state: this.isPlaying ? 'playing' : 'paused' }
    }));
  }
}
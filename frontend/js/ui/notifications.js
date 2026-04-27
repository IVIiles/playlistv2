// ============ NOTIFICATIONS ============
// Crée et gère les toasts dynamiquement (styles délégués au CSS)

/**
 * Crée le conteneur de toasts dans #playlist-app s'il n'existe pas déjà.
 */
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Attachement à #playlist-app pour hériter des variables CSS
        const app = document.getElementById('playlist-app');
        if (app) {
            app.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }
    return container;
}

/**
 * Construit un élément toast (tout le style est dans le CSS).
 * @param {'success'|'error'} type
 * @param {string} msg
 * @returns {HTMLElement}
 */
function createToastElement(type, msg) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = msg;
    toast.appendChild(messageSpan);

    if (type === 'error') {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => toast.remove());
        toast.appendChild(closeBtn);
    }

    return toast;
}

/**
 * Affiche une notification toast.
 * @param {string} msg - Message à afficher
 * @param {'success'|'error'|'info'} [type='info'] - Type de notification
 */
export function showNotification(msg, type = 'info') {
  if (!msg) return;

  const container = ensureToastContainer();
  const validTypes = ['success', 'error', 'info'];
  const toastType = validTypes.includes(type) ? type : 'info';
  const toast = createToastElement(toastType, msg);
  container.appendChild(toast);

  // Suppression automatique apres 3 secondes pour les succes et info
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
  }
}

/**
 * Initialise le système de notifications (nettoie tout toast existant).
 */
export function initNotifications() {
    const container = ensureToastContainer();
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}
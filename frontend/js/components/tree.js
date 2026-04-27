// ============ COMPOSANT ARBORESCENCE ============
// Gère l'affichage de l'arborescence des dossiers et fichiers,
// la navigation, le clic droit, l'expansion / réduction.

import { escapeHtml } from '../utils.js';
import { ICONS_PLAYLIST } from '../../constants/icons_playlist.js';

export class TreeComponent extends EventTarget {
    /**
     * @param {Object} services - Services injectés
     * @param {Object} services.api - Instance de ApiService
     * @param {Function} services.notify - Fonction de notification toast
     * @param {HTMLElement} services.treeContainer - Élément DOM contenant l'arborescence (ex: #folderTree)
     * @param {Object} [options] - Options
     * @param {string} [options.selectedFile] - Fichier actif à mettre en évidence
     */
    constructor(services, options = {}) {
        super();
        this.api = services.api;
        this.notify = services.notify;
        this.container = services.treeContainer;
        this.selectedFile = options.selectedFile || '';
        this.treeListenersInitialized = false;
        this._contextMenuCloseHandler = null;
    }

    /**
     * Initialise l'arborescence : chargement racine et mise en place des événements.
     * @returns {Promise<void>}
     */
    async init() {
        try {
            const data = await this.api.fetchScan('');
            if (!data || data.success === false) {
                throw new Error(data?.error || 'Erreur de chargement');
            }
            this.render(data);
        } catch (error) {
            this.notify(error.message, 'error');
        }
    }

    /**
     * Affiche l'arborescence à partir des données de scan.
     * @param {Object} data - Données { folders: [], files: [] }
     */
    render(data) {
        if (!this.container) return;
        if ((!data.folders || data.folders.length === 0) && (!data.files || data.files.length === 0)) {
            this.container.innerHTML = '<div class="no-results">Aucun contenu</div>';
            return;
        }
        const html = this.buildFolderTreeHTML(data.folders || [], data.files || [], '', 0);
        this.container.innerHTML = html;
        this.initTreeListeners();
    }

    /**
     * Construit le HTML récursif de l'arborescence.
     * @param {string[]} folders
     * @param {string[]} files
     * @param {string} parentPath
     * @param {number} depth
     * @returns {string}
     */
    buildFolderTreeHTML(folders, files, parentPath, depth) {
        let html = '';
        folders.forEach(folder => {
            const folderId = this.getFolderId(parentPath, folder);
            const childPath = parentPath ? `${parentPath}/${folder}` : folder;
            html += `<div class="folder-item" data-folder="${escapeHtml(folder)}" data-path="${escapeHtml(childPath)}">`;
            html += `<span class="folder-toggle" data-toggle="${folderId}">${ICONS_PLAYLIST.ICON_COLLAPSE}</span>`;
            html += `<span class="folder-icon">${ICONS_PLAYLIST.ICON_FOLDER}</span>`;
            html += `<span class="folder-name">${escapeHtml(folder)}</span>`;
            html += `</div>`;
            html += `<div class="folder-children" id="${folderId}"></div>`;
        });

        files.forEach(file => {
            const fileName = file.replace('.csv', '');
            const isActive = file === this.selectedFile ? 'active' : '';
            const fullPath = parentPath || '';
            html += `<div class="file-item ${isActive}" data-file="${escapeHtml(file)}" data-path="${escapeHtml(fullPath)}">`;
            html += `<span class="file-icon">${ICONS_PLAYLIST.ICON_PLAYLIST}</span>`;
            html += `<span class="file-name">${escapeHtml(fileName)}</span>`;
            html += `</div>`;
        });
        return html;
    }

    /**
     * Génère un identifiant unique pour un dossier.
     * @param {string} parentPath
     * @param {string} folder
     * @returns {string}
     */
    getFolderId(parentPath, folder) {
        const path = parentPath ? `${parentPath}_${folder}` : folder;
        return 'folder_' + path.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Initialise la délégation d'événements sur le conteneur de l'arborescence.
     */
    initTreeListeners() {
        if (!this.container || this.treeListenersInitialized) return;

        this.container.addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                const folder = folderItem.dataset.folder;
                const path = folderItem.dataset.path;
                this.expandOrToggle(folder, path);
                return;
            }
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                const file = fileItem.dataset.file;
                const path = fileItem.dataset.path;
                this._emitSelect(file, path);
            }
        });

        // Clic droit unifié
        this.container.addEventListener('contextmenu', async (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                const file = fileItem.dataset.file;
                const path = fileItem.dataset.path;
                this._handleFileContextMenu(e, file, path);
                return;
            }
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                e.preventDefault();
                const folder = folderItem.dataset.folder;
                const path = folderItem.dataset.path;
                await this._handleFolderContextMenu(e, folder, path);
            }
        });

        this.treeListenersInitialized = true;
    }

    /**
     * Déplie ou replie un dossier selon son état.
     * @param {string} folder
     * @param {string} path
     */
    expandOrToggle(folder, path) {
        const parts = path.split('/');
        parts.pop();
        const parentPath = parts.join('/');
        const folderId = this.getFolderId(parentPath, folder);
        const children = document.getElementById(folderId);
        if (!children) return;

        if (children.innerHTML.trim()) {
            this.toggleFolder(folderId);
            return;
        }
        this.expandAndShowChildren(folder, path, parentPath);
    }

    /**
     * Bascule l'affichage d'un dossier (replié/déplié).
     * @param {string} folderId
     */
    toggleFolder(folderId) {
        const children = document.getElementById(folderId);
        const toggle = document.querySelector(`[data-toggle="${folderId}"]`);
        if (!children || !toggle) return;

        if (children.classList.contains('expanded')) {
            children.classList.remove('expanded');
            toggle.textContent = ICONS_PLAYLIST.ICON_COLLAPSE;
        } else {
            children.classList.add('expanded');
            toggle.textContent = ICONS_PLAYLIST.ICON_EXPAND;
        }
    }

    /**
     * Charge et affiche les enfants d'un dossier.
     * @param {string} folder
     * @param {string} path
     * @param {string} parentPath
     */
    async expandAndShowChildren(folder, path, parentPath) {
        const folderId = this.getFolderId(parentPath, folder);
        const children = document.getElementById(folderId);
        if (!children) return;

        try {
            const data = await this.api.fetchScan(path);
            if (!data || data.success === false) {
                throw new Error(data?.error || 'Erreur de chargement');
            }
            const html = this.buildFolderTreeHTML(data.folders || [], data.files || [], path, 0);
            children.innerHTML = html;
            children.classList.add('expanded');
            const toggle = document.querySelector(`[data-toggle="${folderId}"]`);
            if (toggle) toggle.textContent = ICONS_PLAYLIST.ICON_EXPAND;
        } catch (error) {
            this.notify(error.message, 'error');
        }
    }

    /**
     * Déploie séquentiellement l'arborescence jusqu'au chemin donné.
     * @param {string} targetPath
     * @returns {Promise<void>}
     */
    async expandToPath(targetPath) {
        if (!targetPath) return;
        const parts = targetPath.split('/');
        let parentPath = '';
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const folderId = this.getFolderId(parentPath, part);
            const children = document.getElementById(folderId);
            if (children && !children.classList.contains('expanded')) {
                if (!children.innerHTML.trim()) {
                    await this._expandFolderPart(part, parentPath);
                }
                children.classList.add('expanded');
                const toggle = document.querySelector(`[data-toggle="${folderId}"]`);
                if (toggle) toggle.textContent = ICONS_PLAYLIST.ICON_EXPAND;
            }
            parentPath = parentPath ? `${parentPath}/${part}` : part;
        }
    }

    /**
     * Charge et injecte le contenu d'un dossier intermédiaire.
     * @param {string} folder
     * @param {string} parentPath
     */
    async _expandFolderPart(folder, parentPath) {
        const currentPath = parentPath ? `${parentPath}/${folder}` : folder;
        const folderId = this.getFolderId(parentPath, folder);
        const children = document.getElementById(folderId);
        if (!children) return;
        try {
            const data = await this.api.fetchScan(currentPath);
            if (data && data.success) {
                children.innerHTML = this.buildFolderTreeHTML(data.folders || [], data.files || [], currentPath, 0);
            }
        } catch (error) {
            console.error('Erreur _expandFolderPart:', error);
        }
    }

    /**
     * Déploie toute l'arborescence (via scan récursif).
     */
    async expandAllFolders() {
        try {
            const data = await this.api.fetchScanRecursive();
            if (!data || !data.success || !data.tree) {
                throw new Error('Erreur scan récursif');
            }
            this.container.innerHTML = this.parseTreeToHTML(data.tree, '');
            document.querySelectorAll('.folder-children').forEach(el => el.classList.add('expanded'));
            document.querySelectorAll('.folder-toggle').forEach(el => el.textContent = ICONS_PLAYLIST.ICON_EXPAND);
            this.notify('Arborescence déployée', 'success');
        } catch (error) {
            this.notify(error.message, 'error');
        }
    }

    /**
     * Replie tous les dossiers.
     */
    collapseAllFolders() {
        document.querySelectorAll('.folder-children').forEach(el => el.classList.remove('expanded'));
        document.querySelectorAll('.folder-toggle').forEach(el => el.textContent = ICONS_PLAYLIST.ICON_COLLAPSE);
    }

    /**
     * Convertit un objet tree (issu de fetchScanRecursive) en HTML.
     * @param {Object} tree
     * @param {string} parentPath
     * @returns {string}
     */
    parseTreeToHTML(tree, parentPath) {
        let html = '';
        const folders = tree.folders ? Object.keys(tree.folders).sort() : [];
        folders.forEach(folder => {
            const folderId = this.getFolderId(parentPath, folder);
            const childPath = parentPath ? `${parentPath}/${folder}` : folder;
            const children = tree.folders[folder];
            html += `<div class="folder-item" data-folder="${escapeHtml(folder)}" data-path="${escapeHtml(childPath)}">`;
            html += `<span class="folder-toggle" data-toggle="${folderId}">${ICONS_PLAYLIST.ICON_COLLAPSE}</span>`;
            html += `<span class="folder-icon">${ICONS_PLAYLIST.ICON_FOLDER}</span>`;
            html += `<span class="folder-name">${escapeHtml(folder)}</span>`;
            html += `</div>`;
            html += `<div class="folder-children" id="${folderId}">`;
            if (children && (Object.keys(children.folders || {}).length > 0 || (children.files || []).length > 0)) {
                html += this.parseTreeToHTML(children, childPath);
            }
            html += `</div>`;
        });
        const files = tree.files || [];
        files.forEach(file => {
            const fileName = file.replace('.csv', '');
            const isActive = file === this.selectedFile ? 'active' : '';
            const fullPath = parentPath || '';
            html += `<div class="file-item ${isActive}" data-file="${escapeHtml(file)}" data-path="${escapeHtml(fullPath)}">`;
            html += `<span class="file-icon">${ICONS_PLAYLIST.ICON_PLAYLIST}</span>`;
            html += `<span class="file-name">${escapeHtml(fileName)}</span>`;
            html += `</div>`;
        });
        return html;
    }

    // ============ CONTEXT MENU ============

    _handleFileContextMenu(e, file, path) {
        const menu = document.getElementById('context-menu');
        if (!menu) return;
        this._closeContextMenu();
        const btnFile = document.getElementById('ctx-add-file');
        const btnFolder = document.getElementById('ctx-add-folder');
        if (btnFile) btnFile.style.display = 'block';
        if (btnFolder) btnFolder.style.display = 'none';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.classList.add('active');
        menu.dataset.mode = 'file';
        menu.dataset.file = file;
        menu.dataset.path = path;
        this._setupContextMenuClose(menu);
    }

    async _handleFolderContextMenu(e, folder, path) {
        try {
            const data = await this.api.fetchScan(path);
            if (!data || !data.files || data.files.length === 0) return;
            const menu = document.getElementById('context-menu');
            if (!menu) return;
            this._closeContextMenu();
            const btnFile = document.getElementById('ctx-add-file');
            const btnFolder = document.getElementById('ctx-add-folder');
            if (btnFile) btnFile.style.display = 'none';
            if (btnFolder) btnFolder.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.classList.add('active');
            menu.dataset.mode = 'folder';
            menu.dataset.folder = folder;
            menu.dataset.folderPath = path;
            this._setupContextMenuClose(menu);
        } catch (error) {
            this.notify('Erreur vérification dossier', 'error');
        }
    }

    _setupContextMenuClose(menu) {
        const handler = (event) => {
            if (!menu.contains(event.target)) {
                menu.classList.remove('active');
                document.removeEventListener('click', handler);
                this._contextMenuCloseHandler = null;
            }
        };
        this._contextMenuCloseHandler = handler;
        setTimeout(() => document.addEventListener('click', handler), 10);
    }

    _closeContextMenu() {
        if (this._contextMenuCloseHandler) {
            document.removeEventListener('click', this._contextMenuCloseHandler);
            this._contextMenuCloseHandler = null;
        }
        const menu = document.getElementById('context-menu');
        if (menu) menu.classList.remove('active');
    }

    // ============ ACTIONS CONTEXT MENU (déclenchées par l'orchestrateur) ============

    /**
     * Attache les événements sur les boutons du menu contextuel.
     * L'orchestrateur appelle cette méthode une fois.
     */
    bindContextMenuActions() {
        const ctxAddFile = document.getElementById('ctx-add-file');
        const ctxAddFolder = document.getElementById('ctx-add-folder');
        if (ctxAddFile) {
            ctxAddFile.addEventListener('click', () => {
                const menu = document.getElementById('context-menu');
                if (!menu || menu.dataset.mode !== 'file') return;
                const file = menu.dataset.file;
                const path = menu.dataset.path;
                this._closeContextMenu();
                this.dispatchEvent(new CustomEvent('add-file', { detail: { file, path } }));
            });
        }
        if (ctxAddFolder) {
            ctxAddFolder.addEventListener('click', () => {
                const menu = document.getElementById('context-menu');
                if (!menu || menu.dataset.mode !== 'folder') return;
                const folder = menu.dataset.folder;
                const folderPath = menu.dataset.folderPath;
                this._closeContextMenu();
                this.dispatchEvent(new CustomEvent('add-folder', { detail: { folder, folderPath } }));
            });
        }
    }

    /**
     * Émet un événement de sélection de fichier (clic).
     * @param {string} file
     * @param {string} path
     */
    _emitSelect(file, path) {
        this.dispatchEvent(new CustomEvent('select', { detail: { file, path } }));
    }
}
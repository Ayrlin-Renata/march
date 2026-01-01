"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => {
        const subscription = (_event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    getLabel: (filePath) => ipcRenderer.invoke('get-label', filePath),
    setLabel: (filePath, labelIndex) => ipcRenderer.send('set-label', { filePath, labelIndex }),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    updateWatchedFolders: (folders) => ipcRenderer.send('update-watched-folders', folders),
    exportImages: (paths, targetDir) => ipcRenderer.invoke('export-images', { paths, targetDir }),
    resizeWindow: (deltaX) => ipcRenderer.send('resize-window', deltaX),
    setWindowWidth: (width) => ipcRenderer.send('set-window-width', width),
    setMinWindowWidth: (width) => ipcRenderer.send('set-min-window-width', width),
    startDrag: (filePath, iconPath) => ipcRenderer.send('start-drag', { filePath, iconPath }),
    startDragCropped: (filePath, rect) => ipcRenderer.send('start-drag-cropped', { filePath, rect }),
    copyImage: (filePath, rect) => ipcRenderer.invoke('copy-image', { filePath, rect }),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    // Bsky
    saveBskyCredentials: (handle, password) => ipcRenderer.invoke('save-bsky-credentials', { handle, password }),
    hasBskyCredentials: () => ipcRenderer.invoke('has-bsky-credentials'),
    postToBsky: (content) => ipcRenderer.invoke('post-to-bsky', content),
    // Window Controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    updateTitleBarOverlay: (options) => ipcRenderer.send('update-titlebar-overlay', options),
    // Auto-update
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
});

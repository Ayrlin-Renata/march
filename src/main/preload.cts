const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, func: (...args: any[]) => void) => {
        const subscription = (_event: any, ...args: any[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
    getLabel: (filePath: string) => ipcRenderer.invoke('get-label', filePath),
    setLabel: (filePath: string, labelIndex: number) => ipcRenderer.send('set-label', { filePath, labelIndex }),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    updateWatchedFolders: (folders: any[]) => ipcRenderer.send('update-watched-folders', folders),
    exportImages: (paths: string[], targetDir: string) => ipcRenderer.invoke('export-images', { paths, targetDir }),
    resizeWindow: (deltaX: number) => ipcRenderer.send('resize-window', deltaX),
    setWindowWidth: (width: number) => ipcRenderer.send('set-window-width', width),
    setMinWindowWidth: (width: number) => ipcRenderer.send('set-min-window-width', width),
    startDrag: (filePath: string, iconPath: string) => ipcRenderer.send('start-drag', { filePath, iconPath }),
    startDragCropped: (filePath: string, rect: { x: number; y: number; width: number; height: number }) => ipcRenderer.send('start-drag-cropped', { filePath, rect }),
    copyImage: (filePath: string, rect?: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('copy-image', { filePath, rect }),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

    // Bsky
    saveBskyCredentials: (handle: string, password: string) => ipcRenderer.invoke('save-bsky-credentials', { handle, password }),
    hasBskyCredentials: () => ipcRenderer.invoke('has-bsky-credentials'),
    postToBsky: (content: { text: string; imagePaths: string[] }) => ipcRenderer.invoke('post-to-bsky', content),

    // Window Controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    updateTitleBarOverlay: (options: any) => ipcRenderer.send('update-titlebar-overlay', options),

    // Auto-update
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
});

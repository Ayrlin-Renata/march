const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => {
        const subscription = (event, ...args) => func(...args);
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
    startDrag: (filePath, iconPath) => ipcRenderer.send('start-drag', { filePath, iconPath }),
    startDragCropped: (filePath, rect) => ipcRenderer.send('start-drag-cropped', { filePath, rect }),
    copyImage: (filePath, rect) => ipcRenderer.invoke('copy-image', { filePath, rect }),
});

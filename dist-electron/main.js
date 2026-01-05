import { app, BrowserWindow, ipcMain, protocol, net, dialog, nativeImage, clipboard, shell, desktopCapturer, screen } from 'electron';
import updater from 'electron-updater';
const { autoUpdater } = updater;
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupWatcher, reBroadcastFiles, updateWatchPaths, setLabelLookup, removeDiscoveredFile } from './watcher.js';
import { toWinLongPath, normalizeInternalPath } from './utils/pathHelper.js';
import { getWindowState, saveWindowState } from './windowState.js';
import ElectronStore from 'electron-store';
import { saveBskyCredentials, hasBskyCredentials, postToBsky } from './platforms/bsky.js';
import { initOverlayManager, registerHotkeys as registerOverlayHotkeys, handleFeatureToggle, destroyOverlay } from './overlayManager.js';
app.name = 'March';
app.setAppUserModelId('com.ayrlin.march');
if (app.isPackaged) {
    autoUpdater.allowPrerelease = true;
    // Connect logger to console
    autoUpdater.logger = console;
    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking for update...');
        if (win)
            win.webContents.send('update-checking');
    });
    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Update available:', info.version);
        if (win)
            win.webContents.send('update-available', info);
    });
    autoUpdater.on('update-not-available', (info) => {
        console.log('[Updater] App up to date.');
        if (win)
            win.webContents.send('update-not-available', info);
    });
    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err);
        // Send stack trace if available, otherwise just the message
        const errorDetail = err.stack || err.message || 'Unknown error';
        if (win)
            win.webContents.send('update-error', errorDetail);
    });
    autoUpdater.on('download-progress', (progressObj) => {
        if (win)
            win.webContents.send('update-download-progress', progressObj);
    });
    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Updater] Update downloaded:', info.version);
        if (win)
            win.webContents.send('update-downloaded', info);
    });
    autoUpdater.checkForUpdatesAndNotify();
}
ipcMain.handle('check-for-updates', async () => {
    if (app.isPackaged) {
        try {
            return await autoUpdater.checkForUpdates();
        }
        catch (err) {
            console.error('Manual check failed:', err);
            throw err;
        }
    }
    // In dev mode, wait 1s and then tell the renderer it's not available
    // to simulate a check and keep the UI from hanging.
    await new Promise(r => setTimeout(r, 1000));
    if (win)
        win.webContents.send('update-not-available');
    return { dev: true };
});
ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});
const gotTheLock = app.requestSingleInstanceLock();
let win = null;
if (!gotTheLock) {
    app.quit();
}
else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized())
                win.restore();
            win.focus();
        }
    });
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Register protocol before app ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
    { scheme: 'thumb', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);
const settings = new ElectronStore({
    name: 'settings',
    defaults: {
        ingestLookbackDays: 3,
        theme: 'dark',
        watchedFolders: [],
        textPresets: [
            { id: '1', name: 'March', content: 'Trying out #marchphotobox! 📸 ' }
        ],
        labels: [
            { index: 1, name: 'Red', color: '#ff7979ff' },
            { index: 2, name: 'Orange', color: '#ffae78ff' },
            { index: 3, name: 'Yellow', color: '#ffe289ff' },
            { index: 4, name: 'Green', color: '#80ff80ff' },
            { index: 5, name: 'Blue', color: '#74b9ffff' },
            { index: 6, name: 'Purple', color: '#ba75ffff' },
            { index: 7, name: 'Pink', color: '#ff7affff' },
            { index: 8, name: 'White', color: '#8a8a8aff' },
        ],
        isCameraGridFeatureEnabled: false,
        cameraGridHotkeys: { toggle: 'CommandOrControl+Shift+P' },
        cameraGridTargetId: null,
        cameraGridLinesH: 2,
        cameraGridLinesV: 2,
        cameraGridOpacity: 0.5,
        cameraGridColor: '#ffffff',
        isCameraGridActive: false,
    }
});
// Force grid to be inactive on startup
settings.set('isCameraGridActive', false);
const labelStore = new ElectronStore({ name: 'image-labels' });
initOverlayManager(null, settings, __dirname);
const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}
// --- IPC Listeners (Outside of createWindow to prevent duplication) ---
ipcMain.on('update-titlebar-overlay', (_event, options) => {
    if (win && !win.isDestroyed())
        win.setTitleBarOverlay(options);
});
ipcMain.on('window-minimize', () => {
    if (win && !win.isDestroyed())
        win.minimize();
});
ipcMain.on('window-maximize', () => {
    if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
            win.unmaximize();
        }
        else {
            win.maximize();
        }
    }
});
ipcMain.on('window-close', () => {
    if (win && !win.isDestroyed())
        win.close();
});
ipcMain.on('renderer-ready', () => {
    if (win && !win.isDestroyed())
        reBroadcastFiles(win);
});
ipcMain.handle('get-label', (_event, filePath) => {
    return labelStore.get(filePath.replace(/\\/g, '/'), 0);
});
ipcMain.on('set-label', (_event, { filePath, labelIndex }) => {
    labelStore.set(filePath.replace(/\\/g, '/'), labelIndex);
});
ipcMain.handle('get-settings', () => {
    return settings.store;
});
ipcMain.on('set-settings', (_event, newSettings) => {
    if (!settings)
        return;
    const oldLookback = settings.get('ingestLookbackDays');
    if (newSettings.ingestLookbackDays !== undefined) {
        settings.set('ingestLookbackDays', newSettings.ingestLookbackDays);
    }
    if (newSettings.textPresets !== undefined) {
        settings.set('textPresets', newSettings.textPresets);
    }
    if (newSettings.theme !== undefined) {
        settings.set('theme', newSettings.theme);
        if (win && !win.isDestroyed()) {
            const iconPath = path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', newSettings.theme === 'light' ? 'march_icon_color_dark.png' : 'march_icon_color.png');
            win.setIcon(iconPath);
        }
    }
    if (newSettings.labels !== undefined) {
        settings.set('labels', newSettings.labels);
    }
    if (newSettings.watchedFolders !== undefined) {
        settings.set('watchedFolders', newSettings.watchedFolders);
    }
    if (newSettings.isCameraGridFeatureEnabled !== undefined) {
        settings.set('isCameraGridFeatureEnabled', newSettings.isCameraGridFeatureEnabled);
        registerOverlayHotkeys();
        handleFeatureToggle(newSettings.isCameraGridFeatureEnabled);
        // Ensure renderer knows grid is inactive if feature is disabled
        if (!newSettings.isCameraGridFeatureEnabled) {
            newSettings.isCameraGridActive = false;
        }
    }
    if (newSettings.cameraGridHotkeys !== undefined) {
        settings.set('cameraGridHotkeys', newSettings.cameraGridHotkeys);
        registerOverlayHotkeys();
    }
    if (newSettings.cameraGridTargetId !== undefined) {
        settings.set('cameraGridTargetId', newSettings.cameraGridTargetId);
    }
    if (newSettings.cameraGridLinesH !== undefined) {
        settings.set('cameraGridLinesH', newSettings.cameraGridLinesH);
    }
    if (newSettings.cameraGridLinesV !== undefined) {
        settings.set('cameraGridLinesV', newSettings.cameraGridLinesV);
    }
    if (newSettings.cameraGridOpacity !== undefined) {
        settings.set('cameraGridOpacity', newSettings.cameraGridOpacity);
    }
    if (newSettings.cameraGridColor !== undefined) {
        settings.set('cameraGridColor', newSettings.cameraGridColor);
    }
    // If lookback changed, re-trigger watcher
    if (newSettings.ingestLookbackDays !== undefined && newSettings.ingestLookbackDays !== oldLookback) {
        const folderData = settings.get('watchedFolders') || [];
        const watchedPaths = folderData
            .map(f => {
            if (typeof f === 'string')
                return f;
            if (f && typeof f === 'object' && 'path' in f)
                return f.path;
            return null;
        })
            .filter((p) => typeof p === 'string');
        if (win && !win.isDestroyed()) {
            setupWatcher(win, watchedPaths, newSettings.ingestLookbackDays);
        }
    }
});
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
ipcMain.handle('open-external', async (_event, url) => {
    try {
        await shell.openExternal(url);
        return true;
    }
    catch (err) {
        console.error('Failed to open external URL:', url, err);
        return false;
    }
});
ipcMain.handle('select-folder', async () => {
    if (!win || win.isDestroyed())
        return null;
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    if (result.canceled)
        return null;
    return result.filePaths[0];
});
ipcMain.on('update-watched-folders', (_event, folders) => {
    if (!Array.isArray(folders)) {
        console.error('[Main] update-watched-folders received non-array:', folders);
        return;
    }
    const paths = folders.map(f => {
        if (typeof f === 'string')
            return f;
        if (f && typeof f === 'object' && 'path' in f)
            return f.path;
        return null;
    }).filter((p) => typeof p === 'string');
    if (win && !win.isDestroyed())
        updateWatchPaths(win, paths);
    if (folders.length > 0 && typeof folders[0] !== 'string') {
        settings.set('watchedFolders', folders);
    }
});
ipcMain.handle('export-images', async (_event, { paths, targetDir }) => {
    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        for (const src of paths) {
            const fileName = path.basename(src);
            const dest = path.join(targetDir, fileName);
            let finalDest = dest;
            let counter = 1;
            while (fs.existsSync(finalDest)) {
                const ext = path.extname(dest);
                const name = path.basename(dest, ext);
                finalDest = path.join(targetDir, `${name}_${counter}${ext}`);
                counter++;
            }
            fs.copyFileSync(src, finalDest);
        }
        return true;
    }
    catch (err) {
        console.error('Export failed:', err);
        return false;
    }
});
// --- Bsky Integration ---
ipcMain.handle('save-bsky-credentials', (_event, { handle, password }) => {
    return saveBskyCredentials(handle, password);
});
ipcMain.handle('has-bsky-credentials', () => {
    return hasBskyCredentials();
});
ipcMain.handle('post-to-bsky', (_event, content) => {
    return postToBsky(content);
});
ipcMain.on('resize-window', (_event, deltaX) => {
    if (win && !win.isDestroyed()) {
        const [width, height] = win.getSize();
        win.setSize(width + deltaX, height);
    }
});
ipcMain.on('set-min-window-width', (_event, width) => {
    if (win && !win.isDestroyed()) {
        win.setMinimumSize(width, 610);
    }
});
ipcMain.on('set-window-width', (_event, width) => {
    if (win && !win.isDestroyed()) {
        const [, height] = win.getSize();
        win.setSize(width, height);
    }
});
ipcMain.on('start-drag', (event, { filePath }) => {
    const img = nativeImage.createFromPath(filePath);
    const icon = img.resize({ width: 100, height: 100, quality: 'better' });
    event.sender.startDrag({
        file: filePath,
        icon: icon,
    });
});
ipcMain.on('start-drag-cropped', async (event, { filePath, rect }) => {
    try {
        const img = nativeImage.createFromPath(filePath);
        if (img.isEmpty())
            return;
        const imgSize = img.getSize();
        const cropped = img.crop({
            x: Math.max(0, Math.round(rect.x)),
            y: Math.max(0, Math.round(rect.y)),
            width: Math.min(imgSize.width, Math.round(rect.width)),
            height: Math.min(imgSize.height, Math.round(rect.height))
        });
        const tempDir = path.join(app.getPath('userData'), 'temp_crops');
        if (!fs.existsSync(tempDir))
            fs.mkdirSync(tempDir, { recursive: true });
        const fileName = `crop_${crypto.randomBytes(4).toString('hex')}.png`;
        const tempPath = path.join(tempDir, fileName);
        await fs.promises.writeFile(tempPath, cropped.toPNG());
        const icon = cropped.resize({ width: 100, height: 100, quality: 'better' });
        event.sender.startDrag({
            file: tempPath,
            icon: icon,
        });
    }
    catch (err) {
        console.error('Cropped drag failed:', err);
    }
});
ipcMain.handle('copy-image', async (_event, { filePath, rect }) => {
    try {
        const img = nativeImage.createFromPath(filePath);
        if (img.isEmpty())
            return false;
        let finalImg = img;
        if (rect) {
            const imgSize = img.getSize();
            finalImg = img.crop({
                x: Math.max(0, Math.round(rect.x)),
                y: Math.max(0, Math.round(rect.y)),
                width: Math.min(imgSize.width, Math.round(rect.width)),
                height: Math.min(imgSize.height, Math.round(rect.height))
            });
        }
        clipboard.writeImage(finalImg);
        return true;
    }
    catch (err) {
        console.error('[Main] Copy image failed:', err);
        return false;
    }
});
ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 150, height: 150 },
        fetchWindowIcons: false
    });
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id.toString();
    return sources.map((s) => {
        let name = s.name;
        let finalId = s.id;
        if (s.id.startsWith('screen:')) {
            const screenIdFromSource = s.id.replace('screen:', '');
            const screenIndex = parseInt(screenIdFromSource, 10);
            if (!isNaN(screenIndex) && screenIndex < displays.length) {
                const display = displays[screenIndex];
                const isPrimary = display.id.toString() === primaryId;
                name = `Screen ${screenIndex + 1}${isPrimary ? ' (Primary)' : ''}`;
                finalId = `screen:${display.id}`;
            }
        }
        return {
            id: finalId,
            name: name,
            thumbnail: s.thumbnail.toDataURL(),
            appIcon: null
        };
    });
});
function createWindow() {
    const windowState = getWindowState();
    win = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        minWidth: 250,
        minHeight: 610,
        x: windowState.x,
        y: windowState.y,
        show: false, // Don't show until we've applied maximization if needed
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        backgroundColor: '#1e1e1e',
        icon: path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', (settings.get('theme') === 'light') ? 'march_icon_color_dark.png' : 'march_icon_color.png'),
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a1a1b',
            symbolColor: '#ffffff',
            height: 32
        },
    });
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    if (win) {
        if (windowState.isMaximized) {
            win.maximize();
        }
        win.show();
        if (app.isPackaged) {
            win.setMenu(null);
        }
        win.on('maximize', () => {
            if (win)
                saveWindowState(win);
        });
        win.on('unmaximize', () => {
            if (win)
                saveWindowState(win);
        });
        win.on('close', () => {
            if (win)
                saveWindowState(win);
            settings.set('isCameraGridActive', false);
            destroyOverlay();
            win = null;
        });
        win.on('move', () => {
            if (win)
                saveWindowState(win);
        });
        win.on('resize', () => {
            if (win)
                saveWindowState(win);
        });
    }
    initOverlayManager(win, settings, __dirname);
    // Initial setup with lookback
    const lookbackDays = settings.get('ingestLookbackDays');
    const folderData = settings.get('watchedFolders') || [];
    const watchedPaths = folderData
        .map(f => {
        if (typeof f === 'string')
            return f;
        if (f && typeof f === 'object' && 'path' in f)
            return f.path;
        return null;
    })
        .filter((p) => typeof p === 'string');
    if (win) {
        setupWatcher(win, watchedPaths, lookbackDays);
    }
}
setLabelLookup((filePath) => {
    return labelStore.get(filePath.replace(/\\/g, '/'), 0);
});
app.whenReady().then(() => {
    // Modern protocol handling for high-performance image loading
    protocol.handle('media', (request) => {
        try {
            const url = new URL(request.url);
            // pathname will include leading slash, and decodeURIComponent handles emojis/CJK/symbols
            let filePath = decodeURIComponent(url.pathname);
            // Support media://local/C:/... and media://C:/...
            if (url.hostname && url.hostname !== 'local') {
                filePath = url.hostname + ":" + filePath;
            }
            // Cleanup for Windows drive letters
            if (process.platform === 'win32') {
                if (filePath.startsWith('/'))
                    filePath = filePath.slice(1);
            }
            const longPath = toWinLongPath(filePath);
            return net.fetch(pathToFileURL(longPath).toString());
        }
        catch (error) {
            console.error('Failed to resolve media protocol path:', error);
            return new Response('Not Found', { status: 404 });
        }
    });
    // High-performance thumbnail protocol with persistent disk cache
    protocol.handle('thumb', async (request) => {
        try {
            const url = new URL(request.url);
            let filePath = decodeURIComponent(url.pathname);
            const sizeParam = url.searchParams.get('size');
            const targetWidth = sizeParam ? parseInt(sizeParam, 10) : 250;
            const cropParam = url.searchParams.get('crop'); // format: x,y,w,h
            if (url.hostname && url.hostname !== 'local') {
                filePath = url.hostname + ":" + filePath;
            }
            if (process.platform === 'win32') {
                if (filePath.startsWith('/'))
                    filePath = filePath.slice(1);
            }
            // Check Cache (Use long path to avoid false ENOENT)
            const longPathForStat = toWinLongPath(filePath);
            const stats = await fs.promises.stat(longPathForStat);
            const cacheKey = crypto.createHash('md5')
                .update(`${filePath}-${stats.mtimeMs}-${targetWidth}-${cropParam || 'no-crop'}`)
                .digest('hex');
            const cachePath = path.join(cacheDir, `${cacheKey}.jpg`);
            try {
                const cachedBuffer = await fs.promises.readFile(cachePath);
                return new Response(cachedBuffer, {
                    headers: { 'Content-Type': 'image/jpeg' }
                });
            }
            catch {
                // Not in cache, generate it
                const longPath = toWinLongPath(filePath);
                const { nativeImage } = await import('electron');
                let img = nativeImage.createFromPath(longPath);
                if (img.isEmpty()) {
                    try {
                        const buffer = await fs.promises.readFile(longPath);
                        img = nativeImage.createFromBuffer(buffer);
                    }
                    catch (e) {
                        // Still failed
                    }
                }
                if (img.isEmpty()) {
                    return new Response('Locked or Empty', { status: 503 });
                }
                if (cropParam) {
                    const parts = cropParam.split(',').map(v => Math.round(parseFloat(v)));
                    if (parts.length === 4) {
                        const [cx, cy, cw, ch] = parts;
                        const imgSize = img.getSize();
                        img = img.crop({
                            x: Math.max(0, cx),
                            y: Math.max(0, cy),
                            width: Math.min(imgSize.width - cx, cw || 1),
                            height: Math.min(imgSize.height - cy, ch || 1)
                        });
                    }
                }
                // Resize based on provided size or default to 250
                const thumb = img.resize({ width: targetWidth, quality: 'better' });
                if (thumb.isEmpty()) {
                    return new Response('Processing', { status: 503 });
                }
                const buffer = thumb.toJPEG(80);
                // Save to cache asynchronously
                fs.promises.writeFile(cachePath, buffer).catch(err => {
                    console.error('Failed to write to thumb cache:', err);
                });
                return new Response(new Uint8Array(buffer), {
                    headers: { 'Content-Type': 'image/jpeg' }
                });
            }
        }
        catch (error) {
            if (error && (error.code === 'ENOENT' || error.message?.includes('ENOENT'))) {
                // If file is missing, notify renderer to remove it from state
                const win = BrowserWindow.getAllWindows()[0];
                if (win && !win.isDestroyed()) {
                    const url = new URL(request.url);
                    let filePath = decodeURIComponent(url.pathname);
                    if (url.hostname && url.hostname !== 'local') {
                        filePath = url.hostname + ":" + filePath;
                    }
                    if (process.platform === 'win32') {
                        if (filePath.startsWith('/'))
                            filePath = filePath.slice(1);
                    }
                    const normalized = normalizeInternalPath(filePath);
                    // Also remove from watcher's cache so it doesn't come back on re-broadcast
                    removeDiscoveredFile(filePath);
                    win.webContents.send('file-removed', filePath);
                    // Use normalized path for the store to ensure matching
                    win.webContents.send('file-removed', normalized);
                }
                return new Response('Not Found', { status: 404 });
            }
            console.error('Failed to generate thumbnail:', error);
            return new Response('Not Found', { status: 404 });
        }
    });
    if (!settings.get('cameraGridTargetId')) {
        const primaryId = screen.getPrimaryDisplay().id.toString();
        settings.set('cameraGridTargetId', `screen:${primaryId}`);
        console.log(`[Main] Set default target to primary screen: ${primaryId}`);
    }
    settings.set('isCameraGridActive', false);
    registerOverlayHotkeys();
    createWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('before-quit', () => {
    settings.set('isCameraGridActive', false);
    destroyOverlay();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

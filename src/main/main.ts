import { app, BrowserWindow, ipcMain, protocol, net, dialog, nativeImage, clipboard, shell } from 'electron';
import { updateElectronApp } from 'update-electron-app';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupWatcher, reBroadcastFiles, updateWatchPaths, setLabelLookup } from './watcher.js';
import { getWindowState, saveWindowState } from './windowState.js';
import ElectronStore from 'electron-store';
import { saveBskyCredentials, hasBskyCredentials, postToBsky } from './platforms/bsky.js';

app.name = 'March';
app.setAppUserModelId('com.ayrlin.march');

if (app.isPackaged) {
    updateElectronApp();
}

const gotTheLock = app.requestSingleInstanceLock();
let win: BrowserWindow | null = null;

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });
}

console.log('[Main] User Data Path:', app.getPath('userData'));

interface AppSettings {
    ingestLookbackDays: number;
    watchedFolders: any[];
    textPresets: any[];
    labels: any[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register protocol before app ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
    { scheme: 'thumb', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

const settings = new ElectronStore<AppSettings>({
    name: 'settings',
    defaults: {
        ingestLookbackDays: 3,
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
        ]
    }
}) as any;

const labelStore = new ElectronStore({ name: 'image-labels' }) as any;

const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

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
        icon: path.join(__dirname, 'logo.png'),
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a1a1b',
            symbolColor: '#ffffff',
            height: 32
        },
    });

    ipcMain.on('update-titlebar-overlay', (_event, options) => {
        if (win) win.setTitleBarOverlay(options);
    });

    ipcMain.on('window-minimize', () => {
        if (win) win.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.on('window-close', () => {
        if (win) win.close();
    });

    if (win) {
        if (windowState.isMaximized) {
            win.maximize();
        }
        win.show();

        if (app.isPackaged) {
            win.setMenu(null);
        }

        win.on('maximize', () => {
            if (win) saveWindowState(win);
        });
    }

    if (win) {
        win.on('unmaximize', () => {
            if (win) saveWindowState(win);
        });

        win.on('close', () => {
            if (win) saveWindowState(win);
        });

        win.on('move', () => {
            if (win) saveWindowState(win);
        });

        win.on('resize', () => {
            if (win) saveWindowState(win);
        });
    }

    ipcMain.on('renderer-ready', () => {
        if (win) reBroadcastFiles(win);
    });

    setLabelLookup((filePath: string) => {
        return labelStore.get(filePath.replace(/\\/g, '/'), 0);
    });

    ipcMain.handle('get-label', (_event, filePath) => {
        // Fallback for any legacy code, though we've moved to pre-fetching
        return labelStore.get(filePath.replace(/\\/g, '/'), 0);
    });

    ipcMain.on('set-label', (_event, { filePath, labelIndex }) => {
        labelStore.set(filePath.replace(/\\/g, '/'), labelIndex);
    });

    ipcMain.handle('get-settings', () => {
        return settings.store;
    });

    ipcMain.on('set-settings', (_event, newSettings: Partial<AppSettings>) => {
        const oldLookback = settings.get('ingestLookbackDays');

        if (newSettings.ingestLookbackDays !== undefined) {
            settings.set('ingestLookbackDays', newSettings.ingestLookbackDays);
        }
        if (newSettings.textPresets !== undefined) {
            settings.set('textPresets', newSettings.textPresets);
        }
        if (newSettings.labels !== undefined) {
            settings.set('labels', newSettings.labels);
        }
        if (newSettings.watchedFolders !== undefined) {
            settings.set('watchedFolders', newSettings.watchedFolders);
        }

        // If lookback changed, re-trigger watcher
        if (newSettings.ingestLookbackDays !== undefined && newSettings.ingestLookbackDays !== oldLookback) {
            const folderData = settings.get('watchedFolders') as any[] || [];
            const watchedPaths = folderData
                .map(f => {
                    if (typeof f === 'string') return f;
                    if (f && typeof f === 'object' && 'path' in f) return f.path;
                    return null;
                })
                .filter((p): p is string => typeof p === 'string');

            if (win) {
                setupWatcher(win, watchedPaths, newSettings.ingestLookbackDays);
            }
        }
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('open-external', (_event, url) => {
        return shell.openExternal(url);
    });

    ipcMain.handle('select-folder', async () => {
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.on('update-watched-folders', (_event, folders: any[]) => {
        if (!Array.isArray(folders)) {
            console.error('[Main] update-watched-folders received non-array:', folders);
            return;
        }
        // 'folders' might be a list of strings (paths) or FolderConfigs from renderer
        const paths = folders.map(f => {
            if (typeof f === 'string') return f;
            if (f && typeof f === 'object' && 'path' in f) return f.path;
            return null;
        }).filter((p): p is string => typeof p === 'string');

        if (win) updateWatchPaths(win, paths);

        // If they are full objects, we save them to the store
        if (folders.length > 0 && typeof folders[0] !== 'string') {
            settings.set('watchedFolders', folders);
        }
    });

    ipcMain.handle('export-images', async (_event, { paths, targetDir }: { paths: string[], targetDir: string }) => {
        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            for (const src of paths) {
                const fileName = path.basename(src);
                const dest = path.join(targetDir, fileName);

                // If file exists, append a suffix to avoid overwrite
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
        } catch (err) {
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

    ipcMain.on('resize-window', (_event, deltaX: number) => {
        if (win) {
            const [width, height] = win.getSize();
            win.setSize(width + deltaX, height);
        }
    });

    ipcMain.on('set-window-width', (_event, width: number) => {
        if (win) {
            const [, height] = win.getSize();
            win.setSize(width, height);
        }
    });

    ipcMain.on('start-drag', (event, { filePath }) => {
        // Generate a small icon on the fly for the drag preview
        const img = nativeImage.createFromPath(filePath);
        const icon = img.resize({ width: 100, height: 100, quality: 'better' });

        event.sender.startDrag({
            file: filePath,
            icon: icon,
        });
    });

    ipcMain.on('start-drag-cropped', async (event, { filePath, rect }) => {
        try {
            console.log(`[Main] start-drag-cropped for ${filePath}`, rect);
            const img = nativeImage.createFromPath(filePath);
            if (img.isEmpty()) {
                console.error('[Main] Image is empty, drag failed');
                return;
            }

            const imgSize = img.getSize();
            console.log(`[Main/Drag] Path: ${filePath}`);
            console.log(`[Main/Drag] rect: ${JSON.stringify(rect)}`);
            console.log(`[Main/Drag] Image size: ${imgSize.width}x${imgSize.height}`);

            const cropped = img.crop({
                x: Math.max(0, Math.round(rect.x)),
                y: Math.max(0, Math.round(rect.y)),
                width: Math.min(imgSize.width, Math.round(rect.width)),
                height: Math.min(imgSize.height, Math.round(rect.height))
            });

            // Generate a temp file
            const tempDir = path.join(app.getPath('userData'), 'temp_crops');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const fileName = `crop_${crypto.randomBytes(4).toString('hex')}.png`;
            const tempPath = path.join(tempDir, fileName);

            await fs.promises.writeFile(tempPath, cropped.toPNG());

            const icon = cropped.resize({ width: 100, height: 100, quality: 'better' });

            event.sender.startDrag({
                file: tempPath,
                icon: icon,
            });
        } catch (err) {
            console.error('Cropped drag failed:', err);
        }
    });

    ipcMain.handle('copy-image', async (_event, { filePath, rect }) => {
        try {
            console.log(`[Main] copy-image for ${filePath}`, rect);
            const img = nativeImage.createFromPath(filePath);
            if (img.isEmpty()) return false;

            let finalImg = img;
            if (rect) {
                const imgSize = img.getSize();
                console.log(`[Main/Copy] rect: ${JSON.stringify(rect)}`);
                console.log(`[Main/Copy] Image size: ${imgSize.width}x${imgSize.height}`);
                finalImg = img.crop({
                    x: Math.max(0, Math.round(rect.x)),
                    y: Math.max(0, Math.round(rect.y)),
                    width: Math.min(imgSize.width, Math.round(rect.width)),
                    height: Math.min(imgSize.height, Math.round(rect.height))
                });
            }

            clipboard.writeImage(finalImg);
            console.log('[Main] Image copied to clipboard');
            return true;
        } catch (err) {
            console.error('[Main] Copy image failed:', err);
            return false;
        }
    });

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Initial setup with lookback
    // Initial setup with lookback
    const lookbackDays = settings.get('ingestLookbackDays');
    const folderData = settings.get('watchedFolders') as any[] || [];
    const watchedPaths = folderData
        .map(f => {
            if (typeof f === 'string') return f;
            if (f && typeof f === 'object' && 'path' in f) return f.path;
            return null;
        })
        .filter((p): p is string => typeof p === 'string');

    if (win) {
        setupWatcher(win, watchedPaths, lookbackDays);
    }
}

app.whenReady().then(() => {
    // Modern protocol handling for high-performance image loading
    protocol.handle('media', (request) => {
        try {
            const url = new URL(request.url);
            let filePath = decodeURIComponent(url.pathname);

            // Support both media://local/F:/... and media://F:/...
            if (url.hostname && url.hostname !== 'local') {
                filePath = url.hostname + ":" + filePath;
            }

            if (process.platform === 'win32' && filePath.startsWith('/')) {
                filePath = filePath.slice(1);
            }

            return net.fetch(pathToFileURL(filePath).toString());
        } catch (error) {
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

            if (process.platform === 'win32' && filePath.startsWith('/')) {
                filePath = filePath.slice(1);
            }

            // Check Cache
            const stats = await fs.promises.stat(filePath);
            const cacheKey = crypto.createHash('md5')
                .update(`${filePath}-${stats.mtimeMs}-${targetWidth}-${cropParam || 'no-crop'}`)
                .digest('hex');
            const cachePath = path.join(cacheDir, `${cacheKey}.jpg`);

            try {
                const cachedBuffer = await fs.promises.readFile(cachePath);
                return new Response(cachedBuffer, {
                    headers: { 'Content-Type': 'image/jpeg' }
                });
            } catch {
                // Not in cache, generate it
                const { nativeImage } = await import('electron');
                let img = nativeImage.createFromPath(filePath);

                if (cropParam) {
                    const [cx, cy, cw, ch] = cropParam.split(',').map(v => Math.round(parseFloat(v)));
                    const imgSize = img.getSize();
                    console.log(`[Main/Thumb] Crop Request: ${cropParam}, ImgSize: ${imgSize.width}x${imgSize.height}`);
                    img = img.crop({
                        x: Math.max(0, cx),
                        y: Math.max(0, cy),
                        width: Math.min(imgSize.width - cx, cw),
                        height: Math.min(imgSize.height - cy, ch)
                    });
                }

                // Resize based on provided size or default to 250
                const thumb = img.resize({ width: targetWidth, quality: 'better' });
                const buffer = thumb.toJPEG(80);

                // Save to cache asynchronously
                fs.promises.writeFile(cachePath, buffer).catch(err => {
                    console.error('Failed to write to thumb cache:', err);
                });

                return new Response(new Uint8Array(buffer), {
                    headers: { 'Content-Type': 'image/jpeg' }
                });
            }
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            return new Response('Not Found', { status: 404 });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

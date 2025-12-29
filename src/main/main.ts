import { app, BrowserWindow, ipcMain, protocol, net, dialog, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupWatcher, reBroadcastFiles, updateWatchPaths } from './watcher.js';
import { getWindowState, saveWindowState } from './windowState.js';
import ElectronStore from 'electron-store';

interface AppSettings {
    ingestLookbackDays: number;
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
        ingestLookbackDays: 3
    }
}) as any;

const labelStore = new ElectronStore({ name: 'image-labels' }) as any;

const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

function createWindow() {
    const windowState = getWindowState();

    const win = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        backgroundColor: '#1e1e1e',
    });

    win.on('close', () => {
        saveWindowState(win);
    });

    win.on('move', () => {
        saveWindowState(win);
    });

    win.on('resize', () => {
        saveWindowState(win);
    });

    ipcMain.on('renderer-ready', () => {
        reBroadcastFiles(win);
    });

    ipcMain.handle('get-label', (_event, filePath) => {
        return labelStore.get(filePath.replace(/\\/g, '/'), 0);
    });

    ipcMain.on('set-label', (_event, { filePath, labelIndex }) => {
        labelStore.set(filePath.replace(/\\/g, '/'), labelIndex);
    });

    ipcMain.on('set-settings', (_event, newSettings: Partial<AppSettings>) => {
        if (newSettings.ingestLookbackDays !== undefined) {
            settings.set('ingestLookbackDays', newSettings.ingestLookbackDays);
        }
    });

    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.on('update-watched-folders', (_event, folders: string[]) => {
        updateWatchPaths(win, folders);
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

    ipcMain.on('resize-window', (_event, deltaX: number) => {
        const [width, height] = win.getSize();
        win.setSize(width + deltaX, height);
    });

    ipcMain.on('set-window-width', (_event, width: number) => {
        const [, height] = win.getSize();
        win.setSize(width, height);
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

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Initial setup with lookback
    const lookbackDays = settings.get('ingestLookbackDays');
    setupWatcher(win, [], lookbackDays);
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

            if (url.hostname && url.hostname !== 'local') {
                filePath = url.hostname + ":" + filePath;
            }

            if (process.platform === 'win32' && filePath.startsWith('/')) {
                filePath = filePath.slice(1);
            }

            // Check Cache
            const stats = await fs.promises.stat(filePath);
            const cacheKey = crypto.createHash('md5')
                .update(`${filePath}-${stats.mtimeMs}-${targetWidth}`)
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
                const img = nativeImage.createFromPath(filePath);

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

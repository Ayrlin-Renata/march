import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupWatcher, reBroadcastFiles } from './watcher.js';
import { getWindowState, saveWindowState } from './windowState.js';
import ElectronStore from 'electron-store';

interface AppSettings {
    ingestLookbackDays: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register protocol before app ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

const settings = new ElectronStore<AppSettings>({
    name: 'settings',
    defaults: {
        ingestLookbackDays: 3
    }
}) as any;

const labelStore = new ElectronStore({ name: 'image-labels' }) as any;

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
            webSecurity: true, // Re-enable security now that we have a protocol
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
        console.log('Renderer signaled ready, sending initial files...');
        reBroadcastFiles(win);
    });

    ipcMain.handle('get-label', (_event, filePath) => {
        return labelStore.get(filePath.replace(/\\/g, '/'), 0);
    });

    ipcMain.on('set-label', (_event, { filePath, labelIndex }) => {
        labelStore.set(filePath.replace(/\\/g, '/'), labelIndex);
    });

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Setup isolated watcher test
    const watchPath = path.join(app.getAppPath(), 'test_ingestion');
    const lookbackDays = settings.get('ingestLookbackDays');
    setupWatcher(win, watchPath, lookbackDays);
}

app.whenReady().then(() => {
    // Modern protocol handling for high-performance image loading
    protocol.handle('media', (request) => {
        try {
            const url = new URL(request.url);
            let filePath = decodeURIComponent(url.pathname);

            // Support both media://local/F:/... and media://F:/...
            if (url.hostname && url.hostname !== 'local') {
                // If hostname is e.g. "f", and pathname starts with "/", combine them: "f:/..."
                filePath = url.hostname + ":" + filePath;
            }

            // On Windows, strip any leading slash that might remain (e.g. /F:/ -> F:/)
            if (process.platform === 'win32' && filePath.startsWith('/')) {
                filePath = filePath.slice(1);
            }

            return net.fetch(pathToFileURL(filePath).toString());
        } catch (error) {
            console.error('Failed to resolve media protocol path:', error);
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

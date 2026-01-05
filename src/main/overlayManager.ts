import { app, BrowserWindow, globalShortcut, screen, ipcMain } from 'electron';
import path from 'path';

let win: BrowserWindow | null = null;
let overlayWin: BrowserWindow | null = null;
let destroyOverlayTimeout: NodeJS.Timeout | null = null;
let settings: any = null;
let dirname: string = '';
let isInitialized = false;

export function initOverlayManager(mainWindow: BrowserWindow | null, settingsStore: any, currentDir: string) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        win = mainWindow;
    } else {
        win = null;
    }
    settings = settingsStore;
    dirname = currentDir;

    if (isInitialized) return;
    isInitialized = true;

    // --- Overlay IPC ---
    ipcMain.on('toggle-camera-grid', (_event, active: boolean) => {
        if (overlayWin && overlayWin.isDestroyed()) {
            overlayWin = null;
        }
        const isCurrentlyActive = !!(overlayWin && overlayWin.isVisible());
        if (active !== isCurrentlyActive) {
            toggleOverlay();
        }
    });

    ipcMain.on('update-camera-grid-target', (_event, targetId: string | null) => {
        if (!settings) return;
        settings.set('cameraGridTargetId', targetId);
        if (overlayWin && !overlayWin.isDestroyed()) {
            const targetBounds = getTargetBounds(targetId);
            overlayWin.setBounds(targetBounds);
        }
    });
}

export function getTargetBounds(targetId: string | null) {
    let targetBounds = screen.getPrimaryDisplay().bounds;

    if (targetId) {
        if (targetId.startsWith('screen:')) {
            const displayIdOrIndex = targetId.replace('screen:', '');
            const displays = screen.getAllDisplays();

            // Try matching by Display ID first
            let display = displays.find(d => d.id.toString() === displayIdOrIndex);

            // Fallback: If it's a small number, it might be an index
            if (!display && /^\d+$/.test(displayIdOrIndex)) {
                const idx = parseInt(displayIdOrIndex, 10);
                if (idx >= 0 && idx < displays.length) {
                    display = displays[idx];
                }
            }

            if (display) {
                targetBounds = display.bounds;
            }
        }
    }

    return targetBounds;
}

function getSafeOffscreenPosition() {
    const displays = screen.getAllDisplays();
    let minX = 0;
    let minY = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    displays.forEach(d => {
        minX = Math.min(minX, d.bounds.x);
        minY = Math.min(minY, d.bounds.y);
        maxWidth = Math.max(maxWidth, d.bounds.width);
        maxHeight = Math.max(maxHeight, d.bounds.height);
    });

    const offset = Math.max(maxWidth, maxHeight) * 2;
    return { x: minX - offset, y: minY - offset };
}

export function createOverlayWindow() {
    if (destroyOverlayTimeout) {
        clearTimeout(destroyOverlayTimeout);
        destroyOverlayTimeout = null;
    }

    const targetId = settings.get('cameraGridTargetId');
    const targetBounds = getTargetBounds(targetId);

    if (overlayWin) {
        overlayWin.show();
        overlayWin.setBounds(targetBounds);
        return;
    }

    const safePos = getSafeOffscreenPosition();

    overlayWin = new BrowserWindow({
        x: safePos.x,
        y: safePos.y,
        width: targetBounds.width,
        height: targetBounds.height,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        show: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        focusable: false,
        enableLargerThanScreen: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    overlayWin.setIgnoreMouseEvents(true);
    overlayWin.setAlwaysOnTop(true, 'screen-saver');
    overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        overlayWin.loadURL('http://localhost:5173#/overlay');
    } else {
        overlayWin.loadFile(path.join(dirname, '../dist/index.html'), { hash: 'overlay' });
    }

    overlayWin.on('ready-to-show', () => {
        if (overlayWin) {
            overlayWin.webContents.setZoomLevel(0);
        }
    });

    // Instead of waiting for ready-to-show (which takes ~500ms), 
    // wait exactly 500ms and then move the grid onscreen for the first toggle.
    setTimeout(() => {
        if (overlayWin && !overlayWin.isDestroyed()) {
            const isActive = settings.get('isCameraGridActive');
            if (isActive) {
                overlayWin.setBounds(targetBounds);
                overlayWin.show();
            }
        }
    }, 500);

    overlayWin.on('closed', () => {
        overlayWin = null;
        if (destroyOverlayTimeout) {
            clearTimeout(destroyOverlayTimeout);
            destroyOverlayTimeout = null;
        }
    });
}

export function toggleOverlay() {
    const isDesiredActive = !settings.get('isCameraGridActive');
    settings.set('isCameraGridActive', isDesiredActive);

    if (isDesiredActive) {
        if (overlayWin && !overlayWin.isDestroyed()) {
            overlayWin.show();
            const targetId = settings.get('cameraGridTargetId');
            const targetBounds = getTargetBounds(targetId);
            overlayWin.setBounds(targetBounds);
            if (destroyOverlayTimeout) {
                clearTimeout(destroyOverlayTimeout);
                destroyOverlayTimeout = null;
            }
        } else {
            createOverlayWindow();
        }
        if (win && !win.isDestroyed()) win.webContents.send('camera-grid-status', true);
    } else {
        if (overlayWin && !overlayWin.isDestroyed()) {
            overlayWin.hide();
            // 2-minute persistence
            if (destroyOverlayTimeout) clearTimeout(destroyOverlayTimeout);
            destroyOverlayTimeout = setTimeout(() => {
                if (overlayWin && !overlayWin.isDestroyed() && !settings.get('isCameraGridActive')) {
                    overlayWin.close();
                }
            }, 2 * 60 * 1000);
        } else {
            // If overlayWin is null or destroyed, just clear any timeout
            if (destroyOverlayTimeout) {
                clearTimeout(destroyOverlayTimeout);
                destroyOverlayTimeout = null;
            }
        }
        if (win && !win.isDestroyed()) win.webContents.send('camera-grid-status', false);
    }
}

export function registerHotkeys() {
    globalShortcut.unregisterAll();
    const hotkeys = settings.get('cameraGridHotkeys');
    const isEnabled = settings.get('isCameraGridFeatureEnabled');

    if (isEnabled && hotkeys?.toggle) {
        try {
            globalShortcut.register(hotkeys.toggle, () => {
                toggleOverlay();
            });
        } catch (err) {
            console.error('[Main] Failed to register overlay hotkey:', err);
        }
    }
}

export function handleFeatureToggle(enabled: boolean) {
    if (!enabled) {
        settings.set('isCameraGridActive', false);
        if (overlayWin && !overlayWin.isDestroyed()) {
            overlayWin.close();
        }
    }
}

export function destroyOverlay() {
    if (destroyOverlayTimeout) {
        clearTimeout(destroyOverlayTimeout);
        destroyOverlayTimeout = null;
    }
    if (overlayWin && !overlayWin.isDestroyed()) {
        overlayWin.destroy();
    }
    overlayWin = null;
}

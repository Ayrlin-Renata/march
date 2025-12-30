import * as chokidar from 'chokidar';
import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

const discoveredFiles = new Map<string, any>();
let activeWatcher: chokidar.FSWatcher | null = null;
let currentLookbackDays = 3;

export function setupWatcher(mainWindow: BrowserWindow, watchPaths: string[], lookbackDays: number = 3) {
    discoveredFiles.clear();

    if (activeWatcher) {
        activeWatcher.close();
    }

    currentLookbackDays = lookbackDays;

    if (watchPaths.length === 0) {
        activeWatcher = null;
        return;
    }

    const watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        depth: 3, // Support nested folders (e.g., Year/Month/Day organization)
    });

    const lookbackThreshold = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);

    const initialBuffer: any[] = [];
    let isReady = false;

    const processFile = (filePath: string, isInitial: boolean = false) => {
        try {
            // Check if it's an image
            const ext = path.extname(filePath).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
            if (!imageExtensions.includes(ext)) return;

            const stats = fs.statSync(filePath);
            // Use the earliest available timestamp to catch true "Creation"
            const timestamp = Math.min(
                stats.birthtimeMs > 0 ? stats.birthtimeMs : Infinity,
                stats.mtimeMs
            );

            if (timestamp >= lookbackThreshold) {
                const img = nativeImage.createFromPath(filePath);
                const size = img.getSize();

                const fileData: any = {
                    path: filePath,
                    name: path.basename(filePath),
                    timestamp,
                    source: path.basename(path.dirname(filePath)),
                    width: size.width,
                    height: size.height
                };

                discoveredFiles.set(filePath, fileData);

                if (isInitial) {
                    initialBuffer.push(fileData);
                } else {
                    // Live updates sent immediately
                    mainWindow.webContents.send('file-added', fileData);
                }
            }
        } catch (err) {
            console.error(`Error reading file stats for ${filePath}:`, err);
        }
    };

    watcher.on('add', (filePath) => {
        processFile(filePath, !isReady);
    });

    watcher.on('ready', () => {
        isReady = true;
        // Sort buffer: Newest First
        initialBuffer.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`Initial scan complete. Sending ${initialBuffer.length} files (Newest First).`);

        // Send in batches to avoid freezing IPC
        const BATCH_SIZE = 50;
        for (let i = 0; i < initialBuffer.length; i += BATCH_SIZE) {
            const batch = initialBuffer.slice(i, i + BATCH_SIZE);
            batch.forEach(f => mainWindow.webContents.send('file-added', f));
        }
    });

    activeWatcher = watcher;
    return watcher;
}

let debounceTimer: NodeJS.Timeout | null = null;

export function updateWatchPaths(mainWindow: BrowserWindow, watchPaths: string[]) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        console.log(`Updating watch paths: ${watchPaths.join(', ')}`);
        setupWatcher(mainWindow, watchPaths, currentLookbackDays);
        debounceTimer = null;
    }, 500);
}

export function reBroadcastFiles(mainWindow: BrowserWindow) {
    console.log(`Re-broadcasting ${discoveredFiles.size} files to renderer`);
    discoveredFiles.forEach((fileData) => {
        mainWindow.webContents.send('file-added', fileData);
    });
}

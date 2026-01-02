import * as chokidar from 'chokidar';
import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

const discoveredFiles = new Map<string, any>();
let activeWatcher: chokidar.FSWatcher | null = null;
let currentLookbackDays = 3;
let getLabelFn: (path: string) => number = () => 0;

export function setLabelLookup(fn: (path: string) => number) {
    getLabelFn = fn;
}

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

    if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discovery-started');
    }

    const watcher = chokidar.watch(watchPaths, {
        ignored: (p) => {
            // Always ignore node_modules
            if (p.includes('node_modules')) return true;

            // Get the filename/last segment
            const name = path.basename(p);

            // If it's a dot-file or dot-folder
            if (name.startsWith('.') && name !== '.') {
                // Check if this EXACT path is one of the roots we meant to watch
                const isExplicitRoot = watchPaths.some(wp => {
                    return path.resolve(p) === path.resolve(wp);
                });
                // If it's NOT an explicit root, ignore it (e.g. .git, .DS_Store)
                if (isExplicitRoot) return false;
                // If it's NOT an explicit root, ignore it (e.g. .git, .DS_Store)
                return true;
            }
            return false;
        },
        persistent: true,
        depth: 3, // Support nested folders (e.g., Year/Month/Day organization)
    });

    const lookbackThreshold = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    const initialBuffer: any[] = [];
    let isReady = false;
    let pendingFiles = 0;

    const processFile = async (filePath: string, isInitial: boolean = false) => {
        try {
            pendingFiles++;
            // Check if it's an image
            const ext = path.extname(filePath).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
            if (!imageExtensions.includes(ext)) {
                pendingFiles--;
                return;
            }

            const stats = await fs.promises.stat(filePath);
            // Use the earliest available timestamp to catch true "Creation"
            const timestamp = Math.min(
                stats.birthtimeMs > 0 ? stats.birthtimeMs : Infinity,
                stats.mtimeMs
            );

            if (timestamp >= lookbackThreshold) {
                const img = nativeImage.createFromPath(filePath);
                const size = img.getSize();

                const normPath = path.normalize(filePath).toLowerCase();
                const sourceRoot = watchPaths.find(p => {
                    const normP = path.normalize(p).toLowerCase();
                    return normPath.startsWith(normP);
                }) || path.dirname(filePath);


                const fileData: any = {
                    path: filePath,
                    name: path.basename(filePath),
                    timestamp,
                    source: sourceRoot,
                    width: size.width,
                    height: size.height,
                    labelIndex: getLabelFn(filePath)
                };

                discoveredFiles.set(filePath, fileData);

                if (isInitial) {
                    initialBuffer.push(fileData);
                } else if (!mainWindow.isDestroyed()) {
                    // Live updates sent immediately
                    mainWindow.webContents.send('file-added', fileData);
                }
            } else {
            }
        } catch (err) {
            console.error(`Error reading file stats for ${filePath}:`, err);
        } finally {
            pendingFiles--;
            // If we were waiting for the initial batch to finish
            if (isReady && pendingFiles === 0) {
                finalizeInitialScan();
            }
        }
    };

    const finalizeInitialScan = () => {
        if (initialBuffer.length === 0) return;

        // Sort buffer: Newest First
        initialBuffer.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`Initial scan complete. Found ${initialBuffer.length} files. Starting discovery waves...`);

        // WAVE 0: Instant burst (newest 20 files) - get pixels on screen NOW
        const WAVE_0_SIZE = 20;
        const wave0 = initialBuffer.slice(0, WAVE_0_SIZE);
        if (!mainWindow.isDestroyed()) {
            wave0.forEach(f => mainWindow.webContents.send('file-added', f));
        }

        // WAVE 1: Second burst (next 20 files) - get enough pixels to scroll slightly
        const WAVE_1_SIZE = 40;
        if (initialBuffer.length > WAVE_0_SIZE) {
            setTimeout(() => {
                const wave1 = initialBuffer.slice(WAVE_0_SIZE, WAVE_1_SIZE);
                if (!mainWindow.isDestroyed()) {
                    wave1.forEach(f => mainWindow.webContents.send('file-added', f));
                }
            }, 300); // Give Wave 0 time to render fully
        }

        // WAVE 2+: Stagger the remaining files much more slowly
        if (initialBuffer.length > WAVE_1_SIZE) {
            const BATCH_SIZE = 100;
            const STAGGER_MS = 600; // Much slower batches to allow UI interaction
            let currentOffset = WAVE_1_SIZE;

            const sendNextBatch = () => {
                if (mainWindow.isDestroyed()) return;
                const batch = initialBuffer.slice(currentOffset, currentOffset + BATCH_SIZE);
                if (batch.length === 0) return;

                batch.forEach(f => mainWindow.webContents.send('file-added', f));
                currentOffset += BATCH_SIZE;

                if (currentOffset < initialBuffer.length) {
                    setTimeout(sendNextBatch, STAGGER_MS);
                }
            };

            // Start staggered wave after a long breath to let the user move the window
            setTimeout(sendNextBatch, 1500);
        }

        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('discovery-finished');
        }
    };

    watcher.on('add', (filePath) => {
        processFile(filePath, !isReady);
    });

    watcher.on('ready', () => {
        isReady = true;
        // If all pending file stats are already done (unlikely for big folders), finalize now
        if (pendingFiles === 0) {
            finalizeInitialScan();
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

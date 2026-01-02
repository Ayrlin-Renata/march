import * as chokidar from 'chokidar';
import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { toWinLongPath, normalizeInternalPath } from './utils/pathHelper.js';

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

    console.log(`[Watcher] Setting up with ${watchPaths.length} paths. Lookback: ${lookbackDays}d`);
    watchPaths.forEach(p => console.log(`  - ${p}`));

    if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discovery-started');
    }

    const watcher = chokidar.watch(watchPaths, {
        ignored: (p, stats) => {
            const pNorm = path.resolve(p).toLowerCase();
            const name = path.basename(p);

            // Always ignore node_modules
            if (pNorm.includes('node_modules')) return true;

            // 1. If it's a watch root or a parent of one, we MUST NOT ignore it
            // or chokidar won't be able to traverse to the root.
            const isWatchRootOrParent = watchPaths.some(wp => {
                const wpNorm = path.resolve(wp).toLowerCase();
                return wpNorm === pNorm || wpNorm.startsWith(pNorm + path.sep);
            });
            if (isWatchRootOrParent) return false;

            // 2. Ignore dot-files/folders (handled now only if NOT a watch root/parent)
            if (name.startsWith('.') && name !== '.') return true;

            // 3. For files, ignore if not a supported image
            if (stats?.isFile()) {
                const ext = path.extname(p).toLowerCase();
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
                if (!imageExtensions.includes(ext)) return true;
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
            const longPath = toWinLongPath(filePath);

            // Double check existence (handling race conditions)
            if (!fs.existsSync(longPath)) return;

            pendingFiles++;
            // Check if it's an image
            const ext = path.extname(filePath).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
            if (!imageExtensions.includes(ext)) {
                pendingFiles--;
                return;
            }


            const stats = await fs.promises.stat(longPath);
            // Use the earliest available timestamp to catch true "Creation"
            const timestamp = Math.min(
                stats.birthtimeMs > 0 ? stats.birthtimeMs : Infinity,
                stats.mtimeMs
            );

            if (timestamp >= lookbackThreshold) {
                let img = nativeImage.createFromPath(longPath);

                // If path-based creation fails (or returns empty), try buffer-based fallback
                // which is often more robust for Windows long paths or locked files.
                if (img.isEmpty()) {
                    try {
                        const buffer = await fs.promises.readFile(longPath);
                        img = nativeImage.createFromBuffer(buffer);
                    } catch (e) {
                        // Still failed
                    }
                }

                let size = { width: 0, height: 0 };
                if (!img.isEmpty()) {
                    size = img.getSize();
                }

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

                discoveredFiles.set(normalizeInternalPath(filePath), fileData);

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
        // Filter out files that were removed/unlinked during the initial scan period
        const filteredBuffer = initialBuffer.filter(f => discoveredFiles.has(normalizeInternalPath(f.path)));

        if (filteredBuffer.length === 0) {
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('discovery-finished');
            }
            return;
        }

        // Sort buffer: Newest First
        filteredBuffer.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`Initial scan complete. Found ${filteredBuffer.length} files. Starting discovery waves...`);

        // WAVE 0: Instant burst (newest 20 files) - get pixels on screen NOW
        const WAVE_0_SIZE = 20;
        const wave0 = filteredBuffer.slice(0, WAVE_0_SIZE);
        if (!mainWindow.isDestroyed()) {
            wave0.forEach(f => mainWindow.webContents.send('file-added', f));
        }

        // WAVE 1: Second burst (next 20 files) - get enough pixels to scroll slightly
        const WAVE_1_SIZE = 40;
        if (filteredBuffer.length > WAVE_0_SIZE) {
            setTimeout(() => {
                const wave1 = filteredBuffer.slice(WAVE_0_SIZE, WAVE_1_SIZE);
                if (!mainWindow.isDestroyed()) {
                    wave1.forEach(f => mainWindow.webContents.send('file-added', f));
                }
            }, 300); // Give Wave 0 time to render fully
        }

        // WAVE 2+: Stagger the remaining files much more slowly
        if (filteredBuffer.length > WAVE_1_SIZE) {
            const BATCH_SIZE = 100;
            const STAGGER_MS = 600; // Much slower batches to allow UI interaction
            let currentOffset = WAVE_1_SIZE;

            const sendNextBatch = () => {
                if (mainWindow.isDestroyed()) return;
                const batch = filteredBuffer.slice(currentOffset, currentOffset + BATCH_SIZE);
                if (batch.length === 0) return;

                batch.forEach(f => mainWindow.webContents.send('file-added', f));
                currentOffset += BATCH_SIZE;

                if (currentOffset < filteredBuffer.length) {
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
        const key = normalizeInternalPath(filePath);
        console.log(`[Watcher] Add: ${filePath} (Key: ${key})`);
        processFile(filePath, !isReady);
    });

    watcher.on('unlink', (filePath) => {
        const key = normalizeInternalPath(filePath);
        const deleted = discoveredFiles.delete(key);
        console.log(`[Watcher] Unlink: ${filePath} (Success: ${deleted}, Key: ${key})`);
        if (!mainWindow.isDestroyed()) {
            // Send both variants to increase matching probability in the renderer
            mainWindow.webContents.send('file-removed', filePath);
            mainWindow.webContents.send('file-removed', key);
        }
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

let lastWatchPaths: string[] = [];

export function updateWatchPaths(mainWindow: BrowserWindow, watchPaths: string[]) {
    // Check if paths actually changed to avoid redundant restarts
    const sortedNew = [...watchPaths].sort();
    const sortedOld = [...lastWatchPaths].sort();
    if (JSON.stringify(sortedNew) === JSON.stringify(sortedOld)) {
        return;
    }
    lastWatchPaths = watchPaths;

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

export function removeDiscoveredFile(filePath: string) {
    const key = normalizeInternalPath(filePath);
    discoveredFiles.delete(key);
}

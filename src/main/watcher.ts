import chokidar from 'chokidar';
import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

const discoveredFiles = new Map<string, any>();

export function setupWatcher(mainWindow: BrowserWindow, watchPath: string, lookbackDays: number = 3) {
    const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    });

    const lookbackThreshold = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);

    const processFile = (filePath: string) => {
        try {
            const stats = fs.statSync(filePath);
            const timestamp = stats.birthtimeMs || stats.mtimeMs; // birthtime is creation time

            if (timestamp >= lookbackThreshold) {
                const fileData = {
                    path: filePath,
                    name: path.basename(filePath),
                    timestamp,
                    source: path.basename(watchPath),
                };

                discoveredFiles.set(filePath, fileData);
                mainWindow.webContents.send('file-added', fileData);
            }
        } catch (err) {
            console.error(`Error reading file stats for ${filePath}:`, err);
        }
    };

    watcher.on('add', (filePath) => {
        processFile(filePath);
    });

    return watcher;
}

export function reBroadcastFiles(mainWindow: BrowserWindow) {
    console.log(`Re-broadcasting ${discoveredFiles.size} files to renderer`);
    discoveredFiles.forEach((fileData) => {
        mainWindow.webContents.send('file-added', fileData);
    });
}

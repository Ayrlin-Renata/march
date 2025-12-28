import ElectronStore from 'electron-store';
import { BrowserWindow } from 'electron';

interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
}

const store = new ElectronStore<WindowState>({
    name: 'window-state',
    defaults: {
        width: 1200,
        height: 800
    }
}) as any;

export function getWindowState(): WindowState {
    return {
        width: store.get('width'),
        height: store.get('height'),
        x: store.get('x'),
        y: store.get('y'),
    };
}

export function saveWindowState(win: BrowserWindow) {
    if (win.isMaximized()) return;
    const bounds = win.getBounds();
    store.set(bounds);
}

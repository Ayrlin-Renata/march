import ElectronStore from 'electron-store';
import { BrowserWindow } from 'electron';

interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
}

const store = new ElectronStore<WindowState>({
    name: 'window-state',
    defaults: {
        width: 1200,
        height: 800,
        isMaximized: false
    }
}) as any;

export function getWindowState(): WindowState {
    return {
        width: store.get('width'),
        height: store.get('height'),
        x: store.get('x'),
        y: store.get('y'),
        isMaximized: store.get('isMaximized')
    };
}

export function saveWindowState(win: BrowserWindow) {
    const isMaximized = win.isMaximized();
    store.set('isMaximized', isMaximized);

    if (!isMaximized) {
        const bounds = win.getBounds();
        store.set(bounds);
    }
}

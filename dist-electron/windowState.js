import ElectronStore from 'electron-store';
const store = new ElectronStore({
    name: 'window-state',
    defaults: {
        width: 1200,
        height: 800,
        isMaximized: false
    }
});
export function getWindowState() {
    return {
        width: store.get('width'),
        height: store.get('height'),
        x: store.get('x'),
        y: store.get('y'),
        isMaximized: store.get('isMaximized')
    };
}
export function saveWindowState(win) {
    const isMaximized = win.isMaximized();
    store.set('isMaximized', isMaximized);
    if (!isMaximized) {
        const bounds = win.getBounds();
        store.set(bounds);
    }
}

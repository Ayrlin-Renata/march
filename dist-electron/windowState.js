import ElectronStore from 'electron-store';
const store = new ElectronStore({
    name: 'window-state',
    defaults: {
        width: 1200,
        height: 800
    }
});
export function getWindowState() {
    return {
        width: store.get('width'),
        height: store.get('height'),
        x: store.get('x'),
        y: store.get('y'),
    };
}
export function saveWindowState(win) {
    if (win.isMaximized())
        return;
    const bounds = win.getBounds();
    store.set(bounds);
}

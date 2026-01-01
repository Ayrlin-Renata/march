export interface ElectronAPI {
    on: (channel: string, func: (...args: any[]) => void) => () => void;
    send: (channel: string, data: any) => void;
    invoke: (channel: string, data: any) => Promise<any>;
    getLabel: (filePath: string) => Promise<number>;
    setLabel: (filePath: string, labelIndex: number) => void;
    selectFolder: () => Promise<string | null>;
    updateWatchedFolders: (folders: string[]) => void;
    exportImages: (paths: string[], targetDir: string) => Promise<boolean>;
    resizeWindow: (deltaX: number) => void;
    setWindowWidth: (width: number) => void;
    startDrag: (filePath: string, iconPath: string) => void;
    startDragCropped: (filePath: string, rect: { x: number; y: number; width: number; height: number }) => void;
    copyImage: (filePath: string, rect?: { x: number; y: number; width: number; height: number }) => Promise<boolean>;
    getSettings: () => Promise<any>;
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;

    // Bsky
    saveBskyCredentials: (handle: string, password: string) => Promise<boolean>;
    hasBskyCredentials: () => Promise<boolean>;
    postToBsky: (content: { text: string; images: { path: string; crop?: any }[]; scaleImages?: boolean }) => Promise<{ success: boolean; error?: string }>;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    updateTitleBarOverlay: (options: { color: string; symbolColor: string; height: number }) => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

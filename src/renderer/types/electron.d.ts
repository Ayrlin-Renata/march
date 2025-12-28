export interface ElectronAPI {
    on: (channel: string, func: (...args: any[]) => void) => () => void;
    send: (channel: string, data: any) => void;
    invoke: (channel: string, data: any) => Promise<any>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

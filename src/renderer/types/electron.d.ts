export interface ElectronAPI {
    on: (channel: string, func: (...args: any[]) => void) => () => void;
    send: (channel: string, data: any) => void;
    invoke: (channel: string, data: any) => Promise<any>;
    getLabel: (filePath: string) => Promise<number>;
    setLabel: (filePath: string, labelIndex: number) => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

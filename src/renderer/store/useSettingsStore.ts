import { create } from 'zustand';

interface SettingsState {
    scrollSensitivity: number;
    ingestLookbackDays: number;
    sourceFilters: string[]; // List of source folder names/paths to include
    isSettingsOpen: boolean;

    // Actions
    setScrollSensitivity: (val: number) => void;
    setIngestLookbackDays: (val: number) => void;
    setSourceFilters: (filters: string[]) => void;
    toggleSettings: (open?: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    scrollSensitivity: 1.0,
    ingestLookbackDays: 3,
    sourceFilters: [],
    isSettingsOpen: false,

    setScrollSensitivity: (val) => set({ scrollSensitivity: val }),
    setIngestLookbackDays: (val) => set({ ingestLookbackDays: val }),
    setSourceFilters: (filters) => set({ sourceFilters: filters }),
    toggleSettings: (open) => set((state) => ({ isSettingsOpen: open !== undefined ? open : !state.isSettingsOpen })),
}));

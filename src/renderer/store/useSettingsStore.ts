import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    scrollSensitivity: number;
    ingestLookbackDays: number;
    sourceFilters: string[]; // List of source folder names/paths to include
    isSettingsOpen: boolean;
    ingestionWidth: number;
    thumbnailSize: number;

    // Actions
    setScrollSensitivity: (val: number) => void;
    setIngestLookbackDays: (val: number) => void;
    setSourceFilters: (filters: string[]) => void;
    toggleSettings: (open?: boolean) => void;
    setIngestionWidth: (width: number) => void;
    setThumbnailSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            scrollSensitivity: 3.0,
            ingestLookbackDays: 3,
            sourceFilters: [],
            isSettingsOpen: false,
            ingestionWidth: 350,
            thumbnailSize: 120,

            setScrollSensitivity: (val) => set({ scrollSensitivity: val }),
            setIngestLookbackDays: (val) => set({ ingestLookbackDays: val }),
            setSourceFilters: (filters) => set({ sourceFilters: filters }),
            toggleSettings: (open) => set((state) => ({ isSettingsOpen: open !== undefined ? open : !state.isSettingsOpen })),
            setIngestionWidth: (width) => set({ ingestionWidth: width }),
            setThumbnailSize: (size) => set({ thumbnailSize: size }),
        }),
        {
            name: 'march-settings',
            partialize: (state) => ({
                scrollSensitivity: state.scrollSensitivity,
                ingestLookbackDays: state.ingestLookbackDays,
                sourceFilters: state.sourceFilters,
                ingestionWidth: state.ingestionWidth,
                thumbnailSize: state.thumbnailSize,
            }),
        }
    )
);

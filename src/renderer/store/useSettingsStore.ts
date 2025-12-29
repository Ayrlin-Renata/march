import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type PlatformKey } from '../types/stories';

export interface FolderConfig {
    path: string;
    alias: string;
    enabled: boolean;
}

export interface TextPreset {
    id: string;
    name: string;
    content: string;
}

export interface LabelConfig {
    index: number;
    name: string;
    color: string;
}

interface SettingsState {
    scrollSensitivity: number;
    ingestLookbackDays: number;
    sourceFilters: string[]; // List of source folder names/paths to include
    isSettingsOpen: boolean;
    ingestionWidth: number;
    thumbnailSize: number;
    burstThreshold: number;

    // Managers
    watchedFolders: FolderConfig[];
    textPresets: TextPreset[];
    labels: LabelConfig[];
    enabledPlatformKeys: PlatformKey[];
    activeManager: 'folders' | 'presets' | 'platforms' | 'labels' | 'settings_ingestion' | 'settings_lightbox' | 'settings_language' | 'settings_general' | null;
    isBuilderCollapsed: boolean;
    lastBuilderWidth: number;
    storedWindowWidthCollapsed: number;
    storedWindowWidthUncollapsed: number;
    language: string;

    // Actions
    setScrollSensitivity: (val: number) => void;
    setIngestLookbackDays: (val: number) => void;
    setSourceFilters: (filters: string[]) => void;
    toggleSettings: (open?: boolean) => void;
    setIngestionWidth: (width: number) => void;
    setThumbnailSize: (size: number) => void;
    setBurstThreshold: (val: number) => void;
    setLanguage: (lang: string) => void;

    setActiveManager: (manager: 'folders' | 'presets' | 'platforms' | 'labels' | 'settings_ingestion' | 'settings_lightbox' | 'settings_language' | 'settings_general' | null) => void;
    setEnabledPlatformKeys: (keys: PlatformKey[]) => void;
    setBuilderCollapsed: (collapsed: boolean) => void;
    setLastBuilderWidth: (width: number) => void;
    setStoredWindowWidthCollapsed: (width: number) => void;
    setStoredWindowWidthUncollapsed: (width: number) => void;
    reorderLabels: (newLabels: LabelConfig[]) => void;
    updateLabel: (index: number, name: string, color: string) => void;
    addWatchedFolder: (path: string, alias: string) => void;
    removeWatchedFolder: (path: string) => void;
    addTextPreset: (name: string, content: string) => void;
    updateTextPreset: (id: string, name: string, content: string) => void;
    reorderTextPresets: (presets: TextPreset[]) => void;
    removeTextPreset: (id: string) => void;
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
            burstThreshold: 5000,

            watchedFolders: [],
            textPresets: [
                { id: '1', name: 'March Tag', content: '#march' }
            ],
            labels: [
                { index: 1, name: 'Red', color: '#ff4d4d' },
                { index: 2, name: 'Orange', color: '#ff944d' },
                { index: 3, name: 'Yellow', color: '#ffd24d' },
                { index: 4, name: 'Green', color: '#4dff4d' },
                { index: 5, name: 'Blue', color: '#4da6ff' },
                { index: 6, name: 'Purple', color: '#a64dff' },
                { index: 7, name: 'Pink', color: '#ff4dff' },
                { index: 8, name: 'White', color: '#ffffff' },
            ],
            enabledPlatformKeys: ['x', 'bsky', 'threads', 'instagram'],
            activeManager: null,
            isBuilderCollapsed: false,
            lastBuilderWidth: 400,
            storedWindowWidthCollapsed: 800,
            storedWindowWidthUncollapsed: 1200,
            language: 'en',

            setScrollSensitivity: (val) => set({ scrollSensitivity: val }),
            setIngestLookbackDays: (val) => set({ ingestLookbackDays: val }),
            setSourceFilters: (filters) => set({ sourceFilters: filters }),
            toggleSettings: (open) => set((state) => ({
                isSettingsOpen: open !== undefined ? open : !state.isSettingsOpen,
                activeManager: (open || (open === undefined && !state.isSettingsOpen)) ? 'settings_general' : null
            })),
            setIngestionWidth: (width) => set({ ingestionWidth: width }),
            setThumbnailSize: (size) => set({ thumbnailSize: size }),
            setBurstThreshold: (val) => set({ burstThreshold: val }),
            setLanguage: (lang) => set({ language: lang }),

            setActiveManager: (manager) => set({ activeManager: manager, isSettingsOpen: !!(manager && manager.startsWith('settings_')) }),
            setEnabledPlatformKeys: (keys) => set({ enabledPlatformKeys: keys }),
            setBuilderCollapsed: (collapsed) => set({ isBuilderCollapsed: collapsed }),
            setLastBuilderWidth: (width) => set({ lastBuilderWidth: width }),
            setStoredWindowWidthCollapsed: (width) => set({ storedWindowWidthCollapsed: width }),
            setStoredWindowWidthUncollapsed: (width) => set({ storedWindowWidthUncollapsed: width }),
            reorderLabels: (newLabels) => set({ labels: newLabels }),
            updateLabel: (index, name, color) => set((state) => ({
                labels: state.labels.map(l => l.index === index ? { ...l, name, color } : l)
            })),

            addWatchedFolder: (path, alias) => set((state) => ({
                watchedFolders: [...state.watchedFolders, { path, alias, enabled: true }]
            })),
            removeWatchedFolder: (path) => set((state) => ({
                watchedFolders: state.watchedFolders.filter(f => f.path !== path)
            })),
            addTextPreset: (name, content) => set((state) => ({
                textPresets: [...state.textPresets, { id: Date.now().toString(), name, content }]
            })),
            updateTextPreset: (id, name, content) => set((state) => ({
                textPresets: state.textPresets.map(p => p.id === id ? { ...p, name, content } : p)
            })),
            reorderTextPresets: (presets) => set({ textPresets: presets }),
            removeTextPreset: (id) => set((state) => ({
                textPresets: state.textPresets.filter(p => p.id !== id)
            })),
        }),
        {
            name: 'march-settings',
            partialize: (state) => ({
                scrollSensitivity: state.scrollSensitivity,
                ingestLookbackDays: state.ingestLookbackDays,
                sourceFilters: state.sourceFilters,
                ingestionWidth: state.ingestionWidth,
                thumbnailSize: state.thumbnailSize,
                burstThreshold: state.burstThreshold,
                watchedFolders: state.watchedFolders,
                textPresets: state.textPresets,
                labels: state.labels,
                enabledPlatformKeys: state.enabledPlatformKeys,
                isBuilderCollapsed: state.isBuilderCollapsed,
                lastBuilderWidth: state.lastBuilderWidth,
                storedWindowWidthCollapsed: state.storedWindowWidthCollapsed,
                storedWindowWidthUncollapsed: state.storedWindowWidthUncollapsed,
                language: state.language,
            }),
        }
    )
);

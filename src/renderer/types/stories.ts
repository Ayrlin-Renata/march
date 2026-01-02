export type PlatformKey = 'x' | 'bsky';

export type LayoutKey =
    | '1-single' | '1-square' | '1-portrait'
    | '2-vertical' | '2-bsky'
    | '3-large-left' | '3-bsky'
    | '4-grid' | '4-bsky';

export interface SlotCrop {
    x: number;
    y: number;
    scale: number;
    aspect: number;
    expansion: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    pixelCrop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    percentCrop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ImageSlotData {
    imageId: string | null;
    imagePath: string | null;
    originalWidth?: number;
    originalHeight?: number;
    crop: SlotCrop;
}

export interface PlatformConfig {
    enabled: boolean;
    layout: LayoutKey;
    slots: ImageSlotData[];
    text: string;
}

export interface StoryPost {
    id: string;
    name: string;
    platforms: Record<PlatformKey, PlatformConfig>;
    activePlatform: PlatformKey;
    createdAt: number;
}

export const PLATFORMS: { key: PlatformKey; name: string; color: string; bgColor: string; textColor: string }[] = [
    { key: 'x', name: 'X', color: '#1DA1F2', bgColor: '#000000', textColor: '#ffffff' },
    { key: 'bsky', name: 'BlueSky', color: '#0085FF', bgColor: '#000814', textColor: '#ffffff' }
];

export const LAYOUTS: { key: LayoutKey; slots: number; label: string; slotAspects: number[]; platforms: PlatformKey[] }[] = [
    // Shared
    { key: '1-single', slots: 1, label: 'Single (16:9)', slotAspects: [16 / 9], platforms: ['x', 'bsky'] },
    { key: '1-square', slots: 1, label: 'Square (1:1)', slotAspects: [1], platforms: ['x', 'bsky'] },

    // BlueSky Only
    { key: '1-portrait', slots: 1, label: 'Portrait (1:2)', slotAspects: [0.5], platforms: ['bsky'] },

    // X Only
    { key: '2-vertical', slots: 2, label: '2 Images (7:8)', slotAspects: [7 / 8, 7 / 8], platforms: ['x'] },

    // BlueSky Only
    { key: '2-bsky', slots: 2, label: '2 Images (1:1)', slotAspects: [1, 1], platforms: ['bsky'] },

    // X Only
    { key: '3-large-left', slots: 3, label: '3 (Main Left)', slotAspects: [0.75, 1.5, 1.5], platforms: ['x'] },

    // BlueSky Only
    { key: '3-bsky', slots: 3, label: '3 (Bsky)', slotAspects: [1, 2, 2], platforms: ['bsky'] },

    // X Only
    { key: '4-grid', slots: 4, label: '4 Grid (2:1)', slotAspects: [1.5, 1.5, 1.5, 1.5], platforms: ['x'] },

    // BlueSky Only
    { key: '4-bsky', slots: 4, label: '4 Grid (3:2)', slotAspects: [1.5, 1.5, 1.5, 1.5], platforms: ['bsky'] },
];

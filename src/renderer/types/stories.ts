export type PlatformKey = 'x' | 'bsky' | 'threads' | 'instagram' | 'facebook';

export type LayoutKey = '1-single' | '1-square' | '2-vertical' | '3-large-left' | '4-grid';

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

export const PLATFORMS: { key: PlatformKey; name: string; color: string }[] = [
    { key: 'x', name: 'X', color: '#1DA1F2' },
    { key: 'bsky', name: 'BlueSky', color: '#0085FF' },
    { key: 'threads', name: 'Threads', color: '#ffffff' },
    { key: 'instagram', name: 'Instagram', color: '#E1306C' },
    { key: 'facebook', name: 'Facebook', color: '#4267B2' },
];

export const LAYOUTS: { key: LayoutKey; slots: number; label: string }[] = [
    { key: '1-single', slots: 1, label: 'Single (16:9)' },
    { key: '1-square', slots: 1, label: 'Square (1:1)' },
    { key: '2-vertical', slots: 2, label: '2 Images (7:8)' },
    { key: '3-large-left', slots: 3, label: '3 (Main Left)' },
    { key: '4-grid', slots: 4, label: '4 Grid (2:1)' },
];

import { create } from 'zustand';
import type { IngestedImage } from '../types/images';

interface IngestionState {
    images: IngestedImage[];
    selectedImageId: string | null;
    hoveredImageId: string | null;
    hoveredPopoverPos: { top: number, left: number, below: boolean } | null;
    addImages: (newImages: Partial<IngestedImage>[], burstThreshold: number) => void;
    reBurst: (threshold: number) => void;
    setSelectedImageId: (id: string | null) => void;
    setHover: (id: string | null, pos: { top: number, left: number, below: boolean } | null) => void;
    selectNext: () => void;
    selectPrev: () => void;
    cycleLabel: (id: string) => void;
    setLabel: (id: string, index: number) => void;
    resetLabel: (id: string) => void;
    updateImageDimensions: (id: string, width: number, height: number) => void;
    removeImagesBySource: (source: string) => void;
    clearImages: () => void;
    isDiscovering: boolean;
    setIsDiscovering: (val: boolean) => void;
}

export const useIngestionStore = create<IngestionState>((set, get) => ({
    images: [],
    selectedImageId: null,
    hoveredImageId: null,
    hoveredPopoverPos: null,

    addImages: (newImages, burstThreshold) => {
        const { images } = get();
        let updatedImages = [...images];
        const existingPaths = new Set(images.map(img => img.path));

        newImages.forEach((img) => {
            if (!img.path) return;
            // Prevent duplicates using Set O(1)
            if (existingPaths.has(img.path)) return;

            const timestamp = img.timestamp || Date.now();
            const id = img.id || Math.random().toString(36).substring(7);

            const newImg: IngestedImage = {
                id,
                path: img.path || '',
                name: img.name || 'Unknown',
                timestamp,
                source: img.source || 'Default',
                width: img.width,
                height: img.height,
                labelIndex: img.labelIndex || 0
            };

            updatedImages.push(newImg);
            existingPaths.add(img.path);
        });

        // 1. Sort the entire set chronologically (asc) for burst calculation
        updatedImages.sort((a, b) => a.timestamp - b.timestamp);

        // 2. Re-calculate burst IDs based on gaps
        let currentBurstId = '';
        let lastTimestamp = 0;

        updatedImages = updatedImages.map((img) => {
            if (!currentBurstId || (img.timestamp - lastTimestamp) > burstThreshold) {
                currentBurstId = img.id;
            }
            lastTimestamp = img.timestamp;
            return {
                ...img,
                burstId: currentBurstId
            };
        });

        // 3. Reverse for display (descending) - Newest at Top
        updatedImages.sort((a, b) => b.timestamp - a.timestamp);

        set({ images: updatedImages });
    },

    reBurst: (threshold) => {
        const { images } = get();

        // 1. Pull everything back to ascending order for calculation
        const items = [...images].sort((a, b) => a.timestamp - b.timestamp);

        // 2. Re-calculate burst IDs based on the new threshold
        let currentBurstId = '';
        let lastTimestamp = 0;

        const updatedImages = items.map((img) => {
            if (!currentBurstId || (img.timestamp - lastTimestamp) > threshold) {
                currentBurstId = img.id;
            }
            lastTimestamp = img.timestamp;
            return {
                ...img,
                burstId: currentBurstId
            };
        });

        // 3. Reverse again for display - Newest at Top
        updatedImages.sort((a, b) => b.timestamp - a.timestamp);

        set({ images: updatedImages });
    },
    setSelectedImageId: (id) => set({ selectedImageId: id }),
    setHover: (id, pos) => set({ hoveredImageId: id, hoveredPopoverPos: pos }),

    selectNext: () => {
        const { images, selectedImageId } = get();
        if (!selectedImageId) return;
        const currentIndex = images.findIndex(img => img.id === selectedImageId);
        if (currentIndex < images.length - 1) {
            set({ selectedImageId: images[currentIndex + 1].id });
        }
    },

    selectPrev: () => {
        const { images, selectedImageId } = get();
        if (!selectedImageId) return;
        const currentIndex = images.findIndex(img => img.id === selectedImageId);
        if (currentIndex > 0) {
            set({ selectedImageId: images[currentIndex - 1].id });
        }
    },

    cycleLabel: (id) => {
        const { images } = get();
        const updated = images.map(img => {
            if (img.id === id) {
                const nextLabel = ((img.labelIndex || 0) + 1) % 9;

                // Persist to main process
                if (window.electron && window.electron.setLabel) {
                    window.electron.setLabel(img.path, nextLabel);
                }

                return { ...img, labelIndex: nextLabel };
            }
            return img;
        });
        set({ images: updated });
    },

    setLabel: (id, index) => {
        const { images } = get();
        const updated = images.map(img => {
            if (img.id === id) {
                if (window.electron && window.electron.setLabel) {
                    window.electron.setLabel(img.path, index);
                }
                return { ...img, labelIndex: index };
            }
            return img;
        });
        set({ images: updated });
    },

    resetLabel: (id) => {
        const { images } = get();
        const updated = images.map(img => {
            if (img.id === id) {
                if (window.electron && window.electron.setLabel) {
                    window.electron.setLabel(img.path, 0);
                }
                return { ...img, labelIndex: 0 };
            }
            return img;
        });
        set({ images: updated });
    },

    updateImageDimensions: (id, width, height) => {
        set((state) => ({
            images: state.images.map(img => img.id === id ? { ...img, width, height } : img)
        }));
    },

    removeImagesBySource: (source) => {
        set((state) => ({
            images: state.images.filter(img => img.source !== source)
        }));
    },
    clearImages: () => set({ images: [], selectedImageId: null }),
    isDiscovering: false,
    setIsDiscovering: (val) => set({ isDiscovering: val })
}));

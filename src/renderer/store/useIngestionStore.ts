import { create } from 'zustand';
import type { IngestedImage } from '../types/images';

interface IngestionState {
    images: IngestedImage[];
    burstThreshold: number;
    selectedImageId: string | null;
    hoveredImageId: string | null;
    addImages: (newImages: Partial<IngestedImage>[]) => void;
    setBurstThreshold: (threshold: number) => void;
    setSelectedImageId: (id: string | null) => void;
    setHoveredImageId: (id: string | null) => void;
    selectNext: () => void;
    selectPrev: () => void;
    cycleLabel: (id: string) => void;
    resetLabel: (id: string) => void;
    updateImageDimensions: (id: string, width: number, height: number) => void;
}

export const useIngestionStore = create<IngestionState>((set, get) => ({
    images: [],
    burstThreshold: 5000,
    selectedImageId: null,
    hoveredImageId: null,

    addImages: (newImages) => {
        const { images, burstThreshold } = get();
        const updatedImages = [...images];

        newImages.forEach((img) => {
            if (!img.path) return;
            // Prevent duplicates
            if (updatedImages.some(existing => existing.path === img.path)) return;

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
            };

            // Simple burst detection: if last image was taken within threshold
            const lastImg = updatedImages[updatedImages.length - 1];
            if (lastImg && (newImg.timestamp - lastImg.timestamp) < burstThreshold) {
                newImg.burstId = lastImg.burstId || lastImg.id;
            } else {
                newImg.burstId = newImg.id;
            }

            updatedImages.push(newImg);
        });

        // Sort chronologically
        updatedImages.sort((a, b) => a.timestamp - b.timestamp);

        set({ images: updatedImages });
    },

    setBurstThreshold: (threshold) => set({ burstThreshold: threshold }),
    setSelectedImageId: (id) => set({ selectedImageId: id }),
    setHoveredImageId: (id) => set({ hoveredImageId: id }),

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
    }
}));

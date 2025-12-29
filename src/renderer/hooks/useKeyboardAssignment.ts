import { useEffect } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useIngestionStore } from '../store/useIngestionStore';

export const useKeyboardAssignment = () => {
    const { posts, activePostId, setSlotImage } = useStoryStore();
    const { images, selectedImageId, hoveredImageId } = useIngestionStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable if typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (!activePostId) return;

            const activePost = posts.find(p => p.id === activePostId);
            if (!activePost) return;

            const platformKey = activePost.activePlatform;
            const config = activePost.platforms[platformKey];
            if (!config) return;

            // Determine the target image: Previewed image takes precedence over Hovered image
            const targetImageId = selectedImageId || hoveredImageId;
            if (!targetImageId) return;

            const image = images.find(img => img.id === targetImageId);
            if (!image) return;

            // Handle 1-9 and Numpad 1-9
            const key = e.key;
            if (key >= '1' && key <= '9') {
                const slotIndex = parseInt(key) - 1;
                // Check if the slot index is valid for the current configuration
                if (slotIndex < config.slots.length) {
                    const isAlreadyInThisSlot = config.slots[slotIndex]?.imageId === targetImageId;

                    if (isAlreadyInThisSlot) {
                        // Toggle OFF: Unassign from this specific slot
                        setSlotImage(activePostId, platformKey, slotIndex, {
                            id: null as any,
                            path: null as any
                        });
                    } else {
                        // Toggle ON: Assign to this slot
                        setSlotImage(activePostId, platformKey, slotIndex, {
                            id: image.id,
                            path: image.path,
                            width: image.width,
                            height: image.height
                        });
                    }
                }
            }
            // Handle 0 and Numpad 0 for unassign
            else if (key === '0') {
                // Unassign the image from any slot it occupies in the active platform
                config.slots.forEach((slot, idx) => {
                    if (slot.imageId === targetImageId) {
                        setSlotImage(activePostId, platformKey, idx, {
                            id: null as any,
                            path: null as any
                        });
                    }
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activePostId, posts, images, selectedImageId, hoveredImageId, setSlotImage]);
};

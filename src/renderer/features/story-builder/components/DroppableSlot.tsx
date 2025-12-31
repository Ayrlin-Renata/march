import React from 'react';
import { useStoryStore } from '../../../store/useStoryStore';
import type { PlatformKey, ImageSlotData } from '../../../types/stories';
import { MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { getAssetUrl } from '../../../utils/pathUtils';
import { getConstrainedPixelCrop } from '../../../utils/cropUtils';

// Helper for Mockup slots with interactive editing
export const DroppableSlot: React.FC<{
    postId: string,
    slotIndex: number,
    platform: PlatformKey,
    slotData: ImageSlotData,
    onFocus: (rect: DOMRect) => void,
    isFocused?: boolean
}> = ({ postId, slotIndex, platform, slotData, onFocus, isFocused }) => {
    const { updateSlotCrop, updateSlotDimensions } = useStoryStore();
    const slotRef = React.useRef<HTMLDivElement>(null);
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: slotIndex,
        data: { platform }
    });

    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
        setDroppableRef(node);
        (slotRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }, [setDroppableRef]);

    // Load Image Dimensions if missing
    React.useEffect(() => {
        if (slotData.imagePath && (!slotData.originalWidth || !slotData.originalHeight)) {
            const img = new Image();
            img.src = getAssetUrl(slotData.imagePath);
            img.onload = () => {
                const newCrop = { ...slotData.crop };
                // Init pixelCrop if missing or invalid
                if (!newCrop.pixelCrop || newCrop.pixelCrop.width === 0) {
                    const imgAspect = img.width / img.height;
                    const slotAspectMeasured = slotRef.current ? (slotRef.current.offsetWidth / slotRef.current.offsetHeight) : 1;

                    let cropW, cropH;
                    if (imgAspect > slotAspectMeasured) {
                        // Image is wider than slot: match height
                        cropH = img.height;
                        cropW = cropH * slotAspectMeasured;
                    } else {
                        // Image is taller than slot: match width
                        cropW = img.width;
                        cropH = cropW / slotAspectMeasured;
                    }

                    newCrop.pixelCrop = {
                        x: (img.width - cropW) / 2,
                        y: (img.height - cropH) / 2,
                        width: cropW,
                        height: cropH
                    };
                    newCrop.scale = img.width / cropW;
                }

                updateSlotDimensions(postId, platform, slotIndex, img.width, img.height);
                updateSlotCrop(postId, platform, slotIndex, newCrop);
            };
        }
    }, [slotData.imagePath, slotData.originalWidth, slotData.originalHeight, slotData.crop.pixelCrop]);

    // Calculate slot aspect ratio / size for responsiveness
    const [slotSize, setSlotSize] = React.useState({ width: 0, height: 0 });
    const [slotAspect, setSlotAspect] = React.useState(1);

    React.useEffect(() => {
        if (!slotRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                if (width && height) {
                    setSlotSize({ width, height });
                    setSlotAspect(width / height);
                }
            }
        });
        observer.observe(slotRef.current);

        // Initial measurement
        const rect = slotRef.current.getBoundingClientRect();
        if (rect.width && rect.height) {
            setSlotSize({ width: rect.width, height: rect.height });
            setSlotAspect(rect.width / rect.height);
        }

        return () => observer.disconnect();
    }, [slotData.imagePath]); // Re-check when image changes

    // Calculate Scale: Visual Pixels / Image Pixels
    // The "Preview" sees `pixelCrop` portion of the image filling `slotSize`.
    const scale = (slotData.crop.pixelCrop && slotData.crop.pixelCrop.width > 0 && slotSize.width > 0)
        ? slotSize.width / slotData.crop.pixelCrop.width
        : 1;

    // Re-report rect to StoryBuilderArea when size changes while focused
    React.useLayoutEffect(() => {
        if (isFocused && slotRef.current) {
            const rect = slotRef.current.getBoundingClientRect();
            onFocus(rect);
        }
    }, [isFocused, slotSize.width, slotSize.height, slotAspect]);

    // Custom Pan/Zoom Handlers
    const isDragging = React.useRef(false);
    const lastPointer = React.useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isFocused) return;
        e.preventDefault(); // Prevent text selection/native drag
        isDragging.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current || !isFocused || !slotData.crop.pixelCrop || !slotData.originalWidth || !slotData.originalHeight) return;

        let deltaX = e.clientX - lastPointer.current.x;
        let deltaY = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY }; // Update lastPointer to current

        if (e.shiftKey) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                deltaY = 0;
            } else {
                deltaX = 0;
            }
        }

        // Dragging LEFT (negative delta) moves the Image LEFT (content moves with finger).
        // This means the CAMERA (Viewport) moves RIGHT.
        // Viewport X increases.
        // Formula: newPixelCrop.x = old.x - deltaParam.
        // So we need deltaParam to be NEGATIVE if we want X to increase.
        // deltaX is negative. scale is positive.
        // If we pass deltaX directly: newX = oldX - (-10) = oldX + 10. Correct.
        const aspect = slotSize.width / slotSize.height;
        const dImageX = deltaX / scale;
        const dImageY = deltaY / scale;

        const { pixelCrop: newPixelCrop, expansion: newExpansion } = getConstrainedPixelCrop(
            slotData.crop.pixelCrop,
            slotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 },
            slotData.originalWidth,
            slotData.originalHeight,
            aspect,
            dImageX,
            dImageY,
            1 // no zoom
        );

        updateSlotCrop(postId, platform, slotIndex, {
            ...slotData.crop,
            pixelCrop: newPixelCrop,
            expansion: newExpansion
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    // Manual wheel listener for non-passive behavior
    React.useEffect(() => {
        const node = slotRef.current;
        if (!node) return;

        const handleWheel = (e: WheelEvent) => {
            if (!isFocused || !slotData.crop.pixelCrop || !slotData.originalWidth || !slotData.originalHeight) return;
            e.preventDefault();

            // Zoom Speed
            const ZOOM_SPEED = 0.001;
            const zoomFactor = 1 + (e.deltaY * ZOOM_SPEED);
            const aspect = slotSize.width / slotSize.height;

            const { pixelCrop: newPixelCrop, expansion: newExpansion } = getConstrainedPixelCrop(
                slotData.crop.pixelCrop,
                slotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 },
                slotData.originalWidth,
                slotData.originalHeight,
                aspect,
                0,
                0,
                zoomFactor
            );

            // Calculate a "back-ported" scale for the slider UI (ImageWidth / CropWidth)
            const sliderScale = slotData.originalWidth / newPixelCrop.width;

            updateSlotCrop(postId, platform, slotIndex, {
                ...slotData.crop,
                pixelCrop: newPixelCrop,
                expansion: newExpansion,
                scale: sliderScale // Keep slider happy
            });
        };

        node.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            node.removeEventListener('wheel', handleWheel);
        };
    }, [isFocused, slotData.crop.pixelCrop, slotData.originalWidth, slotData.originalHeight, slotSize.width, postId, platform, slotIndex, updateSlotCrop, slotData.crop]);

    // Calculate Render Style
    // We render the `pixelCrop` area into `slotSize` container.
    // CSS Width = originalWidth * Scale
    // Translate = -pixelCrop.x * Scale
    const renderStyle = React.useMemo(() => {
        if (!slotData.crop.pixelCrop || !slotData.originalWidth) return {};

        return {
            width: slotData.originalWidth * scale,
            transform: `translate(${- slotData.crop.pixelCrop.x * scale}px, ${- slotData.crop.pixelCrop.y * scale}px)`,
            transformOrigin: 'top left',
            maxWidth: 'none',
            maxHeight: 'none',
            pointerEvents: 'none' as const
        };
    }, [slotData.crop.pixelCrop, scale, slotData.originalWidth]);

    return (
        <div
            ref={setRefs}
            className={clsx("mockup-slot", isOver && "drag-over", isFocused && "is-focused")}
            style={{
                overflow: isFocused ? 'visible' : 'hidden',
                touchAction: 'none'
            } as any}
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onFocus(rect);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {slotData.imagePath ? (
                <div
                    className="crop-container"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        backgroundColor: '#000'
                    }}
                >
                    <img
                        src={getAssetUrl(slotData.imagePath)}
                        style={{
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            ...renderStyle
                        } as any}
                        draggable={false}
                    />
                </div>
            ) : (
                <div className="slot-placeholder">
                    <MdAdd size={24} />
                    <span>Drop Image</span>
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import type { PlatformKey, ImageSlotData } from '../../types/stories';
import { MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import Cropper, { type Point } from 'react-easy-crop';
import { useDroppable } from '@dnd-kit/core';
import { getAssetUrl } from '../../utils/pathUtils';

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

    const [_imgSize, setImgSize] = React.useState({ width: 0, height: 0 });

    // Combine refs
    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
        setDroppableRef(node);
        (slotRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }, [setDroppableRef]);

    React.useEffect(() => {
        const node = slotRef.current;
        if (!node || !slotData.imagePath) return;

        const onWheel = (e: WheelEvent) => {
            if (!isFocused) return;

            e.preventDefault();
            e.stopPropagation();
            const zoomStep = 0.1;
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            const newZoom = Math.max(1, Math.min(10, slotData.crop.scale + delta));

            if (newZoom === slotData.crop.scale) return;

            const rect = node.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Anchor point relative to slot center in PIXELS
            const centerX = mouseX - rect.width / 2;
            const centerY = mouseY - rect.height / 2;

            const zoomRatio = newZoom / slotData.crop.scale;
            // Shift x/y by how much the anchor point would move due to zoom
            let newX = slotData.crop.x - (centerX * (zoomRatio - 1));
            let newY = slotData.crop.y - (centerY * (zoomRatio - 1));

            // Clamp position to ensure image covers the slot
            if (slotData.originalWidth && slotData.originalHeight) {
                const imgAspect = slotData.originalWidth / slotData.originalHeight;
                const slotAspect = rect.width / rect.height;
                let baseW, baseH;

                if (imgAspect > slotAspect) {
                    baseH = rect.height;
                    baseW = baseH * imgAspect;
                } else {
                    baseW = rect.width;
                    baseH = baseW / imgAspect;
                }

                const visualW = baseW * newZoom;
                const visualH = baseH * newZoom;

                // Max offset allowed to keep coverage
                const maxOffsetX = Math.max(0, (visualW - rect.width) / 2);
                const maxOffsetY = Math.max(0, (visualH - rect.height) / 2);

                newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
                newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));
            }

            updateSlotCrop(postId, platform, slotIndex, {
                ...slotData.crop,
                scale: newZoom,
                x: newX,
                y: newY
            });
        };

        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, [slotData, postId, platform, slotIndex, updateSlotCrop, isFocused]);

    const onCropChange = (location: Point) => {
        // location is {x, y} in pixels. Clamp it here too just in case.
        if (slotRef.current && slotData.originalWidth && slotData.originalHeight) {
            const rect = slotRef.current.getBoundingClientRect();
            const imgAspect = slotData.originalWidth / slotData.originalHeight;
            const slotAspect = rect.width / rect.height;
            let baseW, baseH;
            if (imgAspect > slotAspect) { baseH = rect.height; baseW = baseH * imgAspect; }
            else { baseW = rect.width; baseH = baseW / imgAspect; }
            const visualW = baseW * slotData.crop.scale;
            const visualH = baseH * slotData.crop.scale;
            const maxOffsetX = Math.max(0, (visualW - rect.width) / 2);
            const maxOffsetY = Math.max(0, (visualH - rect.height) / 2);

            const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, location.x));
            const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, location.y));

            updateSlotCrop(postId, platform, slotIndex, { ...slotData.crop, x: clampedX, y: clampedY });
        } else {
            updateSlotCrop(postId, platform, slotIndex, { ...slotData.crop, x: location.x, y: location.y });
        }
    };

    const onZoomChange = (zoom: number) => {
        updateSlotCrop(postId, platform, slotIndex, { ...slotData.crop, scale: zoom });
    };

    const onMediaLoaded = (mediaSize: { width: number; height: number }) => {
        setImgSize(mediaSize);
        if (slotData.originalWidth !== mediaSize.width || slotData.originalHeight !== mediaSize.height) {
            updateSlotDimensions(postId, platform, slotIndex, mediaSize.width, mediaSize.height);
        }
    };


    // Calculate slot aspect ratio for the Cropper
    const [slotAspect, setSlotAspect] = React.useState(1);
    React.useEffect(() => {
        if (slotRef.current) {
            const rect = slotRef.current.getBoundingClientRect();
            if (rect.width && rect.height) {
                setSlotAspect(rect.width / rect.height);
            }
        }
    }, [slotData.imagePath]); // Re-check when image changes or on mount

    return (
        <div
            ref={setRefs}
            className={clsx("mockup-slot", isOver && "drag-over")}
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onFocus(rect);
            }}
        >
            {slotData.imagePath ? (
                <div className="crop-container">
                    <Cropper
                        image={getAssetUrl(slotData.imagePath)}
                        crop={{ x: slotData.crop.x, y: slotData.crop.y }}
                        zoom={slotData.crop.scale}
                        aspect={slotAspect}
                        objectFit="cover"
                        onCropChange={isFocused ? onCropChange : () => { }}
                        onZoomChange={isFocused ? onZoomChange : () => { }}
                        onMediaLoaded={onMediaLoaded}
                        zoomWithScroll={false}
                        showGrid={false}
                        classes={{
                            containerClassName: 'cropper-container',
                            mediaClassName: 'cropper-media-full',
                            cropAreaClassName: 'cropper-crop-area-none', // Hide standard crop area
                        }}
                        style={{
                            containerStyle: { pointerEvents: isFocused ? 'auto' : 'none' } as any
                        }}
                    />
                </div>
            ) : (
                <div className="slot-placeholder">
                    <MdAdd size={20} />
                </div>
            )}
        </div>
    );
};

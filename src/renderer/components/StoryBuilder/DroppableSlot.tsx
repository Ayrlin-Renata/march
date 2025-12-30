import React from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import type { PlatformKey, ImageSlotData } from '../../types/stories';
import { MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import Cropper from 'react-easy-crop';
import { useDroppable } from '@dnd-kit/core';
import { getAssetUrl } from '../../utils/pathUtils';
import { clampCrop } from '../../utils/cropUtils';

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

    const onZoomChange = (zoom: number) => {
        const clamped = clampCrop(
            slotData.originalWidth || 0,
            slotData.originalHeight || 0,
            blueBoxW,
            blueBoxH,
            zoom,
            slotData.crop
        );
        updateSlotCrop(postId, platform, slotIndex, {
            ...slotData.crop,
            scale: zoom,
            x: clamped.x,
            y: clamped.y
        });
    };

    const onMediaLoaded = (mediaSize: { width: number; height: number }) => {
        setImgSize(mediaSize);
        if (slotData.originalWidth !== mediaSize.width || slotData.originalHeight !== mediaSize.height) {
            updateSlotDimensions(postId, platform, slotIndex, mediaSize.width, mediaSize.height);
        }
    };


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

    // Calculate blue box size for the crop area
    const exp = slotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
    const blueBoxW = (slotSize.width || 0) + exp.left + exp.right;
    const blueBoxH = (slotSize.height || 0) + exp.top + exp.bottom;
    const blueBoxAspect = blueBoxW / (blueBoxH || 1);

    // Re-report rect to StoryBuilderArea when size changes while focused
    React.useLayoutEffect(() => {
        if (isFocused && slotRef.current) {
            const rect = slotRef.current.getBoundingClientRect();
            onFocus(rect);
        }
    }, [isFocused, slotSize.width, slotSize.height, slotAspect]);

    return (
        <div
            ref={setRefs}
            className={clsx("mockup-slot", isOver && "drag-over", isFocused && "is-focused")}
            style={{ overflow: isFocused ? 'visible' : 'hidden' } as any}
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onFocus(rect);
            }}
        >
            {slotData.imagePath ? (
                <div
                    className="crop-container"
                    style={{
                        position: 'absolute',
                        top: -exp.top,
                        left: -exp.left,
                        width: blueBoxW,
                        height: blueBoxH,
                        zIndex: 1
                    } as any}
                >
                    <Cropper
                        image={getAssetUrl(slotData.imagePath)}
                        crop={{
                            x: blueBoxW ? (slotData.crop.x / 100) * blueBoxW : 0,
                            y: blueBoxH ? (slotData.crop.y / 100) * blueBoxH : 0
                        }}
                        zoom={slotData.crop.scale}
                        aspect={blueBoxAspect}
                        objectFit="cover"
                        onCropChange={(location) => {
                            if (!isFocused || !blueBoxW || !blueBoxH) return;
                            // Store as percentage of current visual container (Blue Box)
                            updateSlotCrop(postId, platform, slotIndex, {
                                ...slotData.crop,
                                x: (location.x / blueBoxW) * 100,
                                y: (location.y / blueBoxH) * 100
                            });
                        }}
                        onZoomChange={isFocused ? onZoomChange : () => { }}
                        onCropComplete={(percent, pixels) => {
                            // Since the Cropper now matches the blue box, these ARE the final export crops!
                            if (!slotData.crop.pixelCrop ||
                                slotData.crop.pixelCrop.x !== pixels.x ||
                                slotData.crop.pixelCrop.y !== pixels.y ||
                                slotData.crop.pixelCrop.width !== pixels.width ||
                                slotData.crop.pixelCrop.height !== pixels.height) {

                                updateSlotCrop(postId, platform, slotIndex, {
                                    ...slotData.crop,
                                    pixelCrop: pixels,
                                    percentCrop: percent
                                });
                            }
                        }}
                        onMediaLoaded={onMediaLoaded}
                        zoomWithScroll={true}
                        minZoom={1}
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

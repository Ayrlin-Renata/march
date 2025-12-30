import React from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import type { PlatformKey, ImageSlotData } from '../../types/stories';
import { MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import Cropper from 'react-easy-crop';
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

    const onZoomChange = (zoom: number) => {
        updateSlotCrop(postId, platform, slotIndex, { ...slotData.crop, scale: zoom });
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

    // Sync UI crop from store percentCrop on resize or mount
    React.useLayoutEffect(() => {
        if (!slotRef.current || !slotData.crop.percentCrop || !slotData.originalWidth || !slotData.originalHeight) return;

        // This effect ensures that whenever the layout or slot size changes,
        // the Cropper remains stable by using the normalized percentages from the store.
        // The Cropper itself is controlled via percentages converted to the current pixel size of the slot.
    }, [slotAspect]);

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
                        crop={{
                            x: slotSize.width ? (slotData.crop.x / 100) * slotSize.width : 0,
                            y: slotSize.height ? (slotData.crop.y / 100) * slotSize.height : 0
                        }}
                        zoom={slotData.crop.scale}
                        aspect={slotAspect}
                        objectFit="cover"
                        onCropChange={(location) => {
                            if (!isFocused || !slotSize.width || !slotSize.height) return;
                            // Store as percentage of current visual container
                            updateSlotCrop(postId, platform, slotIndex, {
                                ...slotData.crop,
                                x: (location.x / slotSize.width) * 100,
                                y: (location.y / slotSize.height) * 100
                            });
                        }}
                        onZoomChange={isFocused ? onZoomChange : () => { }}
                        onCropComplete={(percent, pixels) => {
                            // Always update pixelCrop and percentCrop so PostView has it, but only if it's different
                            // to avoid unnecessary store updates.
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

import React from 'react';
import { type SlotCrop } from '../../types/stories';

export const GlobalCropOverlay: React.FC<{
    activeSlotRect: DOMRect | null,
    crop: SlotCrop | null,
    originalWidth?: number,
    originalHeight?: number,
    onResizeExpansion: (expansion: { top: number, right: number, bottom: number, left: number }) => void,
    onDeselect: () => void
}> = ({ activeSlotRect, crop, originalWidth, originalHeight, onResizeExpansion, onDeselect }) => {
    // Transient state for smooth resizing without store updates
    const [transientExpansion, setTransientExpansion] = React.useState<{ top: number, right: number, bottom: number, left: number } | null>(null);

    // Calculate max expansion based on current geometry
    const calculateMaxExpansion = React.useCallback(() => {
        if (!activeSlotRect || !crop || !originalWidth || !originalHeight) return null;

        const exp = crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
        const blueBoxW = activeSlotRect.width + exp.left + exp.right;
        const blueBoxH = activeSlotRect.height + exp.top + exp.bottom;

        const imgAspect = originalWidth / originalHeight;
        const targetAspect = blueBoxW / blueBoxH;
        let baseWidth, baseHeight;

        if (imgAspect > targetAspect) {
            baseHeight = blueBoxH;
            baseWidth = baseHeight * imgAspect;
        } else {
            baseWidth = blueBoxW;
            baseHeight = baseWidth / imgAspect;
        }

        const scaledW = baseWidth * crop.scale;
        const scaledH = baseHeight * crop.scale;

        // Convert stored percentage crop back to pixels (now relative to Blue Box)
        const realX = (crop.x / 100) * blueBoxW;
        const realY = (crop.y / 100) * blueBoxH;

        const cX = (blueBoxW - scaledW) / 2;
        const cY = (blueBoxH - scaledH) / 2;

        const imgTopInBlueBox = cY + realY;
        const imgLeftInBlueBox = cX + realX;

        const imgTop = imgTopInBlueBox - exp.top;
        const imgLeft = imgLeftInBlueBox - exp.left;

        const imgRight = imgLeft + scaledW;
        const imgBottom = imgTop + scaledH;

        return {
            top: Math.max(0, -imgTop),
            bottom: Math.max(0, imgBottom - activeSlotRect.height),
            left: Math.max(0, -imgLeft),
            right: Math.max(0, imgRight - activeSlotRect.width),
            sourceStyle: {
                top: activeSlotRect.top + imgTop,
                left: activeSlotRect.left + imgLeft,
                width: scaledW,
                height: scaledH,
                position: 'absolute' as const,
                border: '1px dashed rgba(255, 255, 255, 0.5)',
                boxSizing: 'border-box' as const,
                pointerEvents: 'none' as const
            }
        };
    }, [activeSlotRect, crop, originalWidth, originalHeight]);

    // Global Click Listener for Dismissal
    React.useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // If clicking inside the overlay specific parts (handles) -> Ignore (handled by startResize)
            if (target.closest('.export-crop-boundary')) return;

            // If clicking inside the Preview Slot (source image) -> Ignore (allow panning)
            if (target.closest('.mockup-slot')) return;

            // If clicking inside the Zoom Slider -> Ignore
            if (target.closest('.crop-zoom-slider-container')) return;

            // Otherwise, dismiss
            onDeselect();
        };

        // Capture phase to ensure we see it
        window.addEventListener('mousedown', handleGlobalClick, { capture: true });
        return () => window.removeEventListener('mousedown', handleGlobalClick, { capture: true });
    }, [onDeselect]);

    // Enforce constraints when static props change (e.g. zoom/pan)
    React.useEffect(() => {
        if (transientExpansion) return; // Don't interfere during drag
        const maxExp = calculateMaxExpansion();
        const currentExp = crop?.expansion || { top: 0, right: 0, bottom: 0, left: 0 };

        if (maxExp) {
            let changed = false;
            const newExp = { ...currentExp };

            const limitY = Math.min(maxExp.top, maxExp.bottom);
            const limitX = Math.min(maxExp.left, maxExp.right);

            if (newExp.top > limitY + 0.5 || newExp.bottom > limitY + 0.5) {
                newExp.top = limitY;
                newExp.bottom = limitY;
                changed = true;
            }
            if (newExp.left > limitX + 0.5 || newExp.right > limitX + 0.5) {
                newExp.left = limitX;
                newExp.right = limitX;
                changed = true;
            }

            if (changed) {
                onResizeExpansion(newExp);
            }
        }
    }, [calculateMaxExpansion, onResizeExpansion, transientExpansion]);

    if (!activeSlotRect || !crop) return null;

    const { top, left, width, height } = activeSlotRect;
    const constraints = calculateMaxExpansion();

    // Use transient state if dragging, otherwise prop state
    const displayExpansion = transientExpansion || crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };

    const cropBox = {
        top: top - displayExpansion.top,
        left: left - displayExpansion.left,
        width: width + displayExpansion.left + displayExpansion.right,
        height: height + displayExpansion.top + displayExpansion.bottom
    };

    function startResize(e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') {
        const currentCrop = crop;
        if (!currentCrop) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startExpansion = { ...displayExpansion };
        const maxExp = calculateMaxExpansion() || { top: 9999, right: 9999, bottom: 9999, left: 9999 };

        let latestValue = startExpansion;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            let newExp = { ...startExpansion };

            if (side === 'top') {
                const rawVal = Math.max(0, startExpansion.top - deltaY);
                const limit = Math.min(maxExp.top, maxExp.bottom);
                const val = Math.min(rawVal, limit);
                newExp.top = val;
                newExp.bottom = val;
            } else if (side === 'bottom') {
                const rawVal = Math.max(0, startExpansion.bottom + deltaY);
                const limit = Math.min(maxExp.top, maxExp.bottom);
                const val = Math.min(rawVal, limit);
                newExp.top = val;
                newExp.bottom = val;
            } else if (side === 'left') {
                const rawVal = Math.max(0, startExpansion.left - deltaX);
                const limit = Math.min(maxExp.left, maxExp.right);
                const val = Math.min(rawVal, limit);
                newExp.left = val;
                newExp.right = val;
            } else if (side === 'right') {
                const rawVal = Math.max(0, startExpansion.right + deltaX);
                const limit = Math.min(maxExp.left, maxExp.right);
                const val = Math.min(rawVal, limit);
                newExp.left = val;
                newExp.right = val;
            }

            latestValue = newExp;
            setTransientExpansion(newExp);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            // Commit final value outside the state setter to avoid React warnings
            onResizeExpansion(latestValue);
            setTransientExpansion(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    return (
        <div className="global-crop-overlay-root">
            <div
                className="preview-boundary-highlight"
                style={{ top, left, width, height }}
            />

            {constraints?.sourceStyle && (
                <div
                    className="source-image-boundary"
                    style={constraints.sourceStyle}
                />
            )}

            <div
                className="export-crop-boundary"
                style={{
                    top: Number.isFinite(cropBox.top) ? cropBox.top : 0,
                    left: Number.isFinite(cropBox.left) ? cropBox.left : 0,
                    width: Number.isFinite(cropBox.width) ? Math.max(0, cropBox.width) : 0,
                    height: Number.isFinite(cropBox.height) ? Math.max(0, cropBox.height) : 0
                }}
            >
                <div className="expansion-handle top" onMouseDown={(e) => startResize(e, 'top')} />
                <div className="expansion-handle right" onMouseDown={(e) => startResize(e, 'right')} />
                <div className="expansion-handle bottom" onMouseDown={(e) => startResize(e, 'bottom')} />
                <div className="expansion-handle left" onMouseDown={(e) => startResize(e, 'left')} />
            </div>
        </div>
    );
};

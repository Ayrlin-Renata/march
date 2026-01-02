import React from 'react';
import { type SlotCrop } from '../../../types/stories';
import { MdBorderInner, MdGridGoldenratio, MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface GlobalCropOverlayProps {
    activeSlotRect: DOMRect | null;
    crop: SlotCrop | null;
    originalWidth?: number;
    originalHeight?: number;
    onResizeExpansion: (expansion: { top: number, right: number, bottom: number, left: number }) => void;
    onDeselect: () => void;
    isSymmetric?: boolean;
    onToggleSymmetry?: () => void;
    isFitConstraint?: boolean;
    onPan?: (dx: number, dy: number) => void;
    onZoom?: (factor: number) => void;
    onToggleFit?: () => void;
}

export const GlobalCropOverlay: React.FC<GlobalCropOverlayProps> = ({
    activeSlotRect,
    crop,
    originalWidth,
    originalHeight,
    onResizeExpansion,
    onDeselect,
    isSymmetric = true,
    isFitConstraint = false,
    onPan,
    onZoom,
    onToggleSymmetry,
    onToggleFit
}) => {
    const { t } = useTranslation();

    // Transient state for smooth resizing without store updates
    const [transientExpansion, setTransientExpansion] = React.useState<{ top: number, right: number, bottom: number, left: number } | null>(null);
    const isDraggingHandle = React.useRef(false);
    const isPanning = React.useRef(false);
    const hasDraggedSinceDown = React.useRef(false);
    const justFinishedInteraction = React.useRef(false);
    const lastPos = React.useRef({ x: 0, y: 0 });
    const isMouseDownInsideImage = React.useRef(false);

    // Calculate max expansion and render state
    const calculateState = React.useCallback(() => {
        if (!activeSlotRect || !crop || !originalWidth || !originalHeight || !crop.pixelCrop) return null;

        const px = crop.pixelCrop;
        if (px.width <= 0 || px.height <= 0 || activeSlotRect.width <= 0) return null;

        const scale = activeSlotRect.width / px.width;

        const maxTop = px.y;
        const maxBottom = originalHeight - (px.y + px.height);
        const maxLeft = px.x;
        const maxRight = originalWidth - (px.x + px.width);

        const currentExp = crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
        const slotWidth = activeSlotRect.width;
        const slotHeight = activeSlotRect.height;

        const cropBox = {
            top: -(currentExp.top * scale),
            left: -(currentExp.left * scale),
            width: slotWidth + (currentExp.left + currentExp.right) * scale,
            height: slotHeight + (currentExp.top + currentExp.bottom) * scale
        };

        const sourceStyle = {
            top: -(px.y * scale),
            left: -(px.x * scale),
            width: originalWidth * scale,
            height: originalHeight * scale,
            position: 'absolute' as const,
            boxSizing: 'border-box' as const,
            pointerEvents: 'none' as const,
            zIndex: -1
        };

        const globalSourceRect = {
            top: activeSlotRect.top + sourceStyle.top,
            left: activeSlotRect.left + sourceStyle.left,
            width: sourceStyle.width,
            height: sourceStyle.height
        };

        return {
            max: { top: maxTop, right: maxRight, bottom: maxBottom, left: maxLeft },
            cropBox,
            sourceStyle,
            scale,
            globalSourceRect
        };
    }, [activeSlotRect, crop, originalWidth, originalHeight]);

    // Use a ref to access the latest calculated state in event listeners without re-binding
    const latestStateRef = React.useRef<ReturnType<typeof calculateState>>(null);

    // Calculate state in render
    const state = calculateState();
    latestStateRef.current = state; // Keep ref in sync with render

    const isMouseDownOnControl = React.useRef(false);

    // Updated Dismissal Logic: Only close if clicking OUTSIDE the image boundary
    React.useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if inside image boundary
            const currentState = latestStateRef.current;
            if (currentState) {
                const { left, top, width, height } = currentState.globalSourceRect;
                isMouseDownInsideImage.current = (
                    e.clientX >= left && e.clientX <= left + width &&
                    e.clientY >= top && e.clientY <= top + height
                );
            } else {
                isMouseDownInsideImage.current = false;
            }

            // Check if on any control/handle
            isMouseDownOnControl.current = !!(
                target.closest('.expansion-handle') ||
                target.closest('.crop-top-bar') ||
                target.closest('.top-bar-full') ||
                target.closest('.crop-bottom-zoom-bar') ||
                target.closest('.crop-zoom-slider-container')
            );
        };

        const handleGlobalMouseUp = (e: MouseEvent) => {
            // Guard: If we are in the middle of a complex interaction, don't dismiss
            if (isDraggingHandle.current || isPanning.current || hasDraggedSinceDown.current || justFinishedInteraction.current) {
                return;
            }

            // Guard: If the click *started* inside the image or on a control, don't dismiss even if released outside
            if (isMouseDownInsideImage.current || isMouseDownOnControl.current) {
                return;
            }

            const target = e.target as HTMLElement;

            // Guard: If the release target is a control, don't dismiss
            if (target.closest('.crop-top-bar') || target.closest('.top-bar-full') ||
                target.closest('.crop-bottom-zoom-bar') || target.closest('.crop-zoom-slider-container') ||
                target.closest('.expansion-handle')) {
                return;
            }

            // Check if release is outside image boundary
            const currentState = latestStateRef.current;
            if (currentState) {
                const { left, top, width, height } = currentState.globalSourceRect;
                if (e.clientX >= left && e.clientX <= left + width &&
                    e.clientY >= top && e.clientY <= top + height) {
                    return; // Inside image boundary, don't close
                }
            }

            // If we ended on the root or highlight area, dismiss
            if (target.classList.contains('global-crop-overlay-root') || target.classList.contains('preview-boundary-highlight')) {
                onDeselect();
            }
        };

        window.addEventListener('mousedown', handleMouseDown, true); // Use capture to ensure we see it
        window.addEventListener('mouseup', handleGlobalMouseUp, true);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown, true);
            window.removeEventListener('mouseup', handleGlobalMouseUp, true);
        };
    }, [onDeselect]);

    if (!activeSlotRect) return null;
    const { top: slotTop, left: slotLeft, width: slotWidth, height: slotHeight } = activeSlotRect;

    if (!state || !crop) return null;

    const { cropBox, sourceStyle, scale, max } = state;

    const displayExpansion = transientExpansion || crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };

    const activeBox = transientExpansion ? {
        top: -(transientExpansion.top * scale),
        left: -(transientExpansion.left * scale),
        width: slotWidth + (transientExpansion.left + transientExpansion.right) * scale,
        height: slotHeight + (transientExpansion.top + transientExpansion.bottom) * scale
    } : cropBox;

    function handlePointerDown(e: React.PointerEvent) {
        // Ignore if clicking on buttons/controls
        if ((e.target as HTMLElement).closest('.expansion-handle')) return;
        if ((e.target as HTMLElement).closest('.crop-top-bar')) return;
        if ((e.target as HTMLElement).closest('.top-bar-full')) return; // Added check for top-bar-full
        if ((e.target as HTMLElement).closest('.crop-bottom-zoom-bar')) return;

        hasDraggedSinceDown.current = false;

        if (!onPan) return;

        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onPointerMove = (moveEvent: PointerEvent) => {
            const dx_raw = moveEvent.clientX - lastPos.current.x;
            const dy_raw = moveEvent.clientY - lastPos.current.y;

            if (Math.abs(dx_raw) > 2 || Math.abs(dy_raw) > 2) {
                hasDraggedSinceDown.current = true;
            }

            if (!hasDraggedSinceDown.current) return;

            const dx = dx_raw / scale;
            const dy = dy_raw / scale;

            onPan(dx, dy);

            lastPos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            isPanning.current = false;
            justFinishedInteraction.current = true;
            setTimeout(() => { justFinishedInteraction.current = false; }, 100);

            target.releasePointerCapture(upEvent.pointerId);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    function handleWheel(e: React.WheelEvent) {
        if (!onZoom) return;
        const ZOOM_SPEED = 0.001;
        // Inverted per user request (consistent with app)
        const factor = 1 - (e.deltaY * ZOOM_SPEED);
        onZoom(factor);
    }

    function startResize(e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') {
        isDraggingHandle.current = true;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startExpansion = { ...displayExpansion };

        let latestValue = startExpansion;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const dImageX = deltaX / scale;
            const dImageY = deltaY / scale;

            let newExp = { ...startExpansion };

            const applyFitConstraint = (exp: typeof newExp, axis: 'horizontal' | 'vertical') => {
                if (!isFitConstraint) return;
                if (axis === 'horizontal') {
                    exp.top = 0;
                    exp.bottom = 0;
                } else {
                    exp.left = 0;
                    exp.right = 0;
                }
            };

            if (side === 'top') {
                const rawVal = startExpansion.top - dImageY;
                const val = Math.min(Math.max(0, rawVal), isSymmetric ? Math.min(max.top, max.bottom) : max.top);
                newExp.top = val;
                if (isSymmetric) newExp.bottom = val;
                applyFitConstraint(newExp, 'vertical');
            } else if (side === 'bottom') {
                const rawVal = startExpansion.bottom + dImageY;
                const val = Math.min(Math.max(0, rawVal), isSymmetric ? Math.min(max.bottom, max.top) : max.bottom);
                newExp.bottom = val;
                if (isSymmetric) newExp.top = val;
                applyFitConstraint(newExp, 'vertical');
            } else if (side === 'left') {
                const rawVal = startExpansion.left - dImageX;
                const val = Math.min(Math.max(0, rawVal), isSymmetric ? Math.min(max.left, max.right) : max.left);
                newExp.left = val;
                if (isSymmetric) newExp.right = val;
                applyFitConstraint(newExp, 'horizontal');
            } else if (side === 'right') {
                const rawVal = startExpansion.right + dImageX;
                const val = Math.min(Math.max(0, rawVal), isSymmetric ? Math.min(max.right, max.left) : max.right);
                newExp.right = val;
                if (isSymmetric) newExp.left = val;
                applyFitConstraint(newExp, 'horizontal');
            }

            latestValue = newExp;
            setTransientExpansion(newExp);
        };

        const onMouseUp = () => {
            isDraggingHandle.current = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            onResizeExpansion(latestValue);
            setTransientExpansion(null);

            // Safety delay to prevent immediate dismissal
            justFinishedInteraction.current = true;
            setTimeout(() => { justFinishedInteraction.current = false; }, 100);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    return (
        <div
            className="global-crop-overlay-root"
            onPointerDown={handlePointerDown}
            onWheel={handleWheel}
            onContextMenu={(e) => {
                e.preventDefault();
                onDeselect();
            }}
        >
            <div className="top-bar-full">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        className={clsx("icon-btn", isSymmetric && "active")}
                        onClick={onToggleSymmetry}
                        title={t('symmetric_resize_tooltip')}
                    >
                        <MdBorderInner size={24} />
                    </button>
                    <button
                        className={clsx("icon-btn", isFitConstraint && "active")}
                        onClick={onToggleFit}
                        title={t('fit_constraint_tooltip')}
                    >
                        <MdGridGoldenratio size={24} />
                    </button>
                </div>

                <button
                    className="icon-btn-large"
                    onClick={onDeselect}
                    title={t('close')}
                >
                    <MdClose size={24} />
                </button>
            </div>

            <div
                className="preview-boundary-highlight"
                style={{ top: slotTop, left: slotLeft, width: slotWidth, height: slotHeight }}
            >
                {sourceStyle && <div className="source-image-boundary" style={sourceStyle} />}

                <div
                    className="export-crop-boundary"
                    style={{
                        top: activeBox.top,
                        left: activeBox.left,
                        width: Math.max(1, activeBox.width),
                        height: Math.max(1, activeBox.height),
                        position: 'absolute'
                    }}
                >
                    <div className="expansion-handle top" onMouseDown={(e) => startResize(e, 'top')} />
                    <div className="expansion-handle right" onMouseDown={(e) => startResize(e, 'right')} />
                    <div className="expansion-handle bottom" onMouseDown={(e) => startResize(e, 'bottom')} />
                    <div className="expansion-handle left" onMouseDown={(e) => startResize(e, 'left')} />

                    <div className="corner-accent top-left" />
                    <div className="corner-accent top-right" />
                    <div className="corner-accent bottom-left" />
                    <div className="corner-accent bottom-right" />
                </div>
            </div>

            <div className="crop-bottom-zoom-bar" style={{
                position: 'fixed',
                bottom: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100002,
                pointerEvents: 'auto'
            }}>
                <div className="zoom-slider-box glassy">
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.01"
                        value={crop.scale}
                        onChange={(e) => {
                            const newScale = parseFloat(e.target.value);
                            onZoom?.(newScale / crop.scale);
                        }}
                        className="zoom-slider-input"
                    />
                    <span className="zoom-percent">{crop.scale.toFixed(2)}x</span>
                </div>
            </div>
        </div>
    );
};

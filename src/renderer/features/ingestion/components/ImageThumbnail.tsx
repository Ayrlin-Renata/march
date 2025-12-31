import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdImage } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { useIngestionStore } from '../../../store/useIngestionStore';
import { type IngestedImage } from '../../../types/images';
import { getThumbnailUrl } from '../../../utils/pathUtils';
import { LazyImage } from './LazyImage';
import { ImagePlacementIndicator } from './ImagePlacementIndicator';

export const ImageThumbnail: React.FC<{
    img: IngestedImage;
    isSelected: boolean;
    onSelect: () => void;
    onCycle: () => void;
    onReset: () => void;
}> = React.memo(({ img, isSelected, onSelect, onCycle, onReset }) => {
    const { t } = useTranslation();
    const isHovered = useIngestionStore(s => s.hoveredImageId === img.id);
    const timerRef = React.useRef<any>(null);
    const wasResetRef = React.useRef(false);

    const [holdProgress, setHoldProgress] = React.useState(0);
    const [lockout, setLockout] = React.useState(false);
    const isNativeReady = holdProgress >= 100;
    const holdTimerRef = React.useRef<any>(null);
    const hasTriggeredDragRef = React.useRef(false);

    const initialPointerPosRef = React.useRef<{ x: number; y: number } | null>(null);
    const initialPointerEventRef = React.useRef<React.PointerEvent | null>(null);
    const hasBridgedToDndRef = React.useRef(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: img.id,
        data: img,
        disabled: isNativeReady || lockout
    });

    React.useEffect(() => {
        if (isDragging && holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
            setHoldProgress(0);
        }
    }, [isDragging]);

    const globalReset = React.useCallback(() => {
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldProgress(0);
        hasTriggeredDragRef.current = false;
    }, []);

    React.useEffect(() => {
        window.addEventListener('pointerup', globalReset);
        window.addEventListener('blur', globalReset);
        return () => {
            window.removeEventListener('pointerup', globalReset);
            window.removeEventListener('blur', globalReset);
        };
    }, [globalReset]);

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (wasResetRef.current) {
            wasResetRef.current = false;
            return;
        }
        onCycle();
    };

    const handleMouseDown = (e: React.PointerEvent) => {
        setLockout(false);
        hasBridgedToDndRef.current = false;
        initialPointerPosRef.current = { x: e.clientX, y: e.clientY };
        e.persist();
        initialPointerEventRef.current = e;

        if (e.button === 0) {
            setHoldProgress(0);
            const startTime = Date.now();
            const duration = 600;

            holdTimerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const p = Math.min(100, (elapsed / duration) * 100);
                setHoldProgress(p);
                if (p >= 100) {
                    clearInterval(holdTimerRef.current);
                    setLockout(true);
                    window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
                }
            }, 30);
        } else if (e.button === 2) {
            wasResetRef.current = false;
            timerRef.current = setTimeout(() => {
                onReset();
                wasResetRef.current = true;
            }, 500);
        }
    };

    const handleMouseMove = (e: React.PointerEvent) => {
        if (hasBridgedToDndRef.current) {
            listeners?.onPointerMove?.(e);
            return;
        }

        if (isDragging) return;

        if (isNativeReady || lockout) {
            e.preventDefault();
            e.stopPropagation();

            if (!hasTriggeredDragRef.current) {
                window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

                hasTriggeredDragRef.current = true;
                window.electron.startDrag(img.path, '');
                if (holdTimerRef.current) {
                    clearInterval(holdTimerRef.current);
                    holdTimerRef.current = null;
                }
            }
            return;
        }

        if (initialPointerPosRef.current && (e.buttons & 1)) {
            const dx = e.clientX - initialPointerPosRef.current.x;
            const dy = e.clientY - initialPointerPosRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 15) {
                hasBridgedToDndRef.current = true;
                if (initialPointerEventRef.current) {
                    listeners?.onPointerDown?.(initialPointerEventRef.current);
                }
                listeners?.onPointerMove?.(e);
            }
        }
    };

    const handleMouseUp = (e: React.PointerEvent) => {
        if (hasBridgedToDndRef.current) {
            listeners?.onPointerUp?.(e);
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldProgress(0);
        hasTriggeredDragRef.current = false;
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            data-image-id={img.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={clsx(
                "thumbnail-wrapper",
                isSelected && "selected",
                isDragging && "dragging",
                isHovered && "hovered",
                `label-${img.labelIndex || 0}`
            )}
            onClick={onSelect}
            onContextMenu={handleContextMenu}
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerLeave={handleMouseUp}
            onPointerCancel={handleMouseUp}
            draggable={false}
        >
            <ImagePlacementIndicator imageId={img.id} />
            <div className="thumbnail-inner">
                <div className="thumbnail-card">
                    <div className="thumbnail-placeholder">
                        <MdImage size={32} />
                    </div>
                    <LazyImage
                        src={getThumbnailUrl(img.path)}
                        alt={img.name}
                        className="thumbnail-img"
                    />
                </div>
            </div>

            {holdProgress > 0 && (
                <div className="native-drag-indicator">
                    <div className="progress-bar" style={{ width: `${holdProgress}%` }} />
                    {holdProgress >= 100 && <div className="ready-overlay">{t('ready_to_drag')}</div>}
                </div>
            )}
            <div className="label-glow" />
            <div className="label-bar" />
        </motion.div>
    );
});

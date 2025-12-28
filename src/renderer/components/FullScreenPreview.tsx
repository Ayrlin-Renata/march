import React, { useEffect } from 'react';
import { TransformWrapper, TransformComponent, useControls, useTransformContext } from 'react-zoom-pan-pinch';
import { useIngestionStore } from '../store/useIngestionStore';
import { getAssetUrl } from '../utils/pathUtils';
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';

const PreviewContent: React.FC<{
    selectedImage: any,
    selectedIndex: number,
    images: any[],
    currentScale: number,
    setCurrentScale: (s: number) => void,
    imgRef: React.RefObject<HTMLImageElement | null>
}> = ({ selectedImage, selectedIndex, images, currentScale, setCurrentScale, imgRef }) => {
    const { resetTransform, setTransform } = useControls();
    const { transformState } = useTransformContext();
    const { setSelectedImageId, selectNext, selectPrev } = useIngestionStore();
    const { scrollSensitivity } = useSettingsStore();

    // Note: 10^((val-50)/50) gives 0.1 at 0, 1 at 50, 10 at 100. Let's use 50.
    const logScaleMap = (v: number) => Math.pow(10, (v - 50) / 50);
    const logValMap = (s: number) => Math.log10(s) * 50 + 50;

    const handleZoom = (newScale: number, anchorX: number, anchorY: number) => {
        const clampedScale = Math.min(10, Math.max(0.1, newScale));
        const scaleFactor = clampedScale / transformState.scale;

        let newX = anchorX - (anchorX - transformState.positionX) * scaleFactor;
        let newY = anchorY - (anchorY - transformState.positionY) * scaleFactor;

        // Clamping logic for "partial view"
        if (imgRef.current) {
            const imgW = imgRef.current.naturalWidth;
            const imgH = imgRef.current.naturalHeight;
            // We need to account for 'object-fit: contain' which scales the natural image to the viewport first
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            const ratio = Math.min(viewportW * 0.95 / imgW, viewportH * 0.95 / imgH);
            const initialW = imgW * ratio;
            const initialH = imgH * ratio;

            const currentW = initialW * clampedScale;
            const currentH = initialH * clampedScale;

            const margin = 100; // Keep 100px visible

            // X clamping
            // Max X (left edge of image): viewportW - margin
            // Min X (left edge of image): margin - currentW
            newX = Math.min(viewportW - margin, Math.max(margin - currentW, newX));

            // Y clamping
            newY = Math.min(viewportH - margin, Math.max(margin - currentH, newY));
        }

        setCurrentScale(clampedScale);
        setTransform(newX, newY, clampedScale, 0);
    };

    const viewportRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const manualWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = -e.deltaY;
            const zoomStep = 0.05 * scrollSensitivity;
            const factor = delta > 0 ? (1 + zoomStep) : (1 - zoomStep);
            const newScale = transformState.scale * factor;

            handleZoom(newScale, e.clientX, e.clientY);
        };

        el.addEventListener('wheel', manualWheel, { passive: false });
        return () => el.removeEventListener('wheel', manualWheel);
    }, [scrollSensitivity, transformState.scale, handleZoom]);

    return (
        <div
            ref={viewportRef}
            className="preview-viewport-container"
            onMouseDown={(e) => {
                if (e.button === 1) { // Middle click reset
                    e.preventDefault();
                    resetTransform();
                    setCurrentScale(1);
                }
            }}
        >
            <div className="preview-controls-top glassy">
                <button className="icon-btn close" onClick={() => setSelectedImageId(null)}>
                    <X size={20} />
                </button>
                <div className="top-center-info">
                    <span className="image-name">{selectedImage.name}</span>
                    <span className="image-index">{selectedIndex + 1} / {images.length}</span>
                </div>
                <button className="icon-btn reset" onClick={() => {
                    resetTransform();
                    setCurrentScale(1);
                }}>
                    <RotateCcw size={18} />
                </button>
            </div>

            <div
                className="preview-viewport-main"
            >
                <TransformComponent
                    wrapperStyle={{ width: '100vw', height: '100vh' } as React.CSSProperties}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}
                >
                    <img
                        ref={imgRef}
                        src={getAssetUrl(selectedImage.path)}
                        alt={selectedImage.name}
                        draggable={false}
                        style={{
                            maxWidth: '95%',
                            maxHeight: '95%',
                            objectFit: 'contain',
                            userSelect: 'none',
                            ['WebkitUserDrag' as any]: 'none',
                        }}
                    />
                </TransformComponent>
            </div>

            <button
                className="nav-btn prev"
                onClick={(e) => { e.stopPropagation(); selectPrev(); resetTransform(); setCurrentScale(1); }}
                disabled={selectedIndex === 0}
            >
                <ChevronLeft size={48} />
            </button>
            <button
                className="nav-btn next"
                onClick={(e) => { e.stopPropagation(); selectNext(); resetTransform(); setCurrentScale(1); }}
                disabled={selectedIndex === images.length - 1}
            >
                <ChevronRight size={48} />
            </button>

            <div className="preview-footer-tools">
                <div className="zoom-slider-box glassy">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={logValMap(currentScale)}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const scale = logScaleMap(val);
                            // Anchor at screen center
                            handleZoom(scale, window.innerWidth / 2, window.innerHeight / 2);
                        }}
                        className="zoom-slider-input"
                    />
                    <span className="zoom-percent">{currentScale.toFixed(1)}x</span>
                </div>
            </div>
        </div>
    );
};

const FullScreenPreview: React.FC = () => {
    const { images, selectedImageId, setSelectedImageId, selectNext, selectPrev } = useIngestionStore();
    const [currentScale, setCurrentScale] = React.useState(1);

    const selectedIndex = images.findIndex(img => img.id === selectedImageId);
    const selectedImage = images[selectedIndex];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedImageId) return;
            if (e.key === 'Escape') setSelectedImageId(null);
            if (e.key === 'ArrowRight') selectNext();
            if (e.key === 'ArrowLeft') selectPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageId, setSelectedImageId, selectNext, selectPrev]);

    const imgRef = React.useRef<HTMLImageElement>(null);

    const handlePanning = (ref: any) => {
        if (!imgRef.current) return;
        const state = ref.state;
        const imgW = imgRef.current.naturalWidth;
        const imgH = imgRef.current.naturalHeight;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const ratio = Math.min(viewportW * 0.95 / imgW, viewportH * 0.95 / imgH);
        const currentW = imgW * ratio * state.scale;
        const currentH = imgH * ratio * state.scale;

        const margin = 100;

        const clampedX = Math.min(viewportW - margin, Math.max(margin - currentW, state.positionX));
        const clampedY = Math.min(viewportH - margin, Math.max(margin - currentH, state.positionY));

        if (clampedX !== state.positionX || clampedY !== state.positionY) {
            ref.setTransform(clampedX, clampedY, state.scale, 0);
        }
    };

    if (!selectedImage) return null;

    return (
        <AnimatePresence>
            {selectedImage && (
                <motion.div
                    className="fullscreen-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedImageId(null);
                    }}
                >
                    <TransformWrapper
                        initialScale={1}
                        minScale={0.1}
                        maxScale={10}
                        centerOnInit
                        limitToBounds={false}
                        wheel={{ disabled: true }}
                        panning={{ velocityDisabled: false }}
                        onPanning={handlePanning}
                        onTransformed={(ref) => setCurrentScale(ref.state.scale)}
                    >
                        <PreviewContent
                            selectedImage={selectedImage}
                            selectedIndex={selectedIndex}
                            images={images}
                            currentScale={currentScale}
                            setCurrentScale={setCurrentScale}
                            imgRef={imgRef}
                        />
                    </TransformWrapper>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FullScreenPreview;

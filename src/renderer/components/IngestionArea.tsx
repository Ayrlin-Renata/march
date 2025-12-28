import React from 'react';
import { useIngestionStore } from '../store/useIngestionStore';
import type { IngestedImage } from '../types/images';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '../utils/pathUtils';

const IngestionArea: React.FC = () => {
    const { images, setSelectedImageId, hoveredImageId, setHoveredImageId } = useIngestionStore();
    const [activeSource, setActiveSource] = React.useState('All');
    const [popoverPos, setPopoverPos] = React.useState<{ top: number, left: number, below: boolean } | null>(null);
    const { t } = useTranslation();

    const sources = React.useMemo(() => {
        const unique = Array.from(new Set(images.map(img => img.source)));
        return ['All', ...unique];
    }, [images]);

    const filteredImages = React.useMemo(() => {
        if (activeSource === 'All') return images;
        return images.filter(img => img.source === activeSource);
    }, [images, activeSource]);

    // Group images by burstId
    const bursts = filteredImages.reduce((acc, img) => {
        const lastBurst = acc[acc.length - 1];
        if (lastBurst && lastBurst[0].burstId === img.burstId) {
            lastBurst.push(img);
        } else {
            acc.push([img]);
        }
        return acc;
    }, [] as IngestedImage[][]);

    return (
        <section className="ingestion-area">
            <header className="area-header">
                <h2>{t('ingestion')}</h2>
                <span className="count-badge">{filteredImages.length}</span>
            </header>
            <div className="filter-bar">
                <div className="filter-pill-container scrollable-hidden">
                    {sources.map(src => (
                        <button
                            key={src}
                            className={`filter-pill ${activeSource === src ? 'active' : ''}`}
                            onClick={() => setActiveSource(src)}
                        >
                            {src}
                        </button>
                    ))}
                </div>
            </div>
            <div className="area-body scrollable">
                {bursts.length === 0 ? (
                    <p className="placeholder-text">{t('no_images')}</p>
                ) : (
                    <div className="burst-container">
                        {bursts.map((burst) => (
                            <div key={burst[0].burstId} className="burst-group">
                                <div className="burst-header">
                                    <span className="burst-source">{burst[0].source}</span>
                                    <span className="burst-time">
                                        {new Date(burst[0].timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="thumbnail-grid">
                                    <AnimatePresence>
                                        {burst.map((img) => (
                                            <motion.div
                                                key={img.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className={`thumbnail-wrapper ${hoveredImageId === img.id ? 'hovered' : ''}`}
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const showBelow = rect.top < 250;
                                                    // Calculate left, keeping it at least 135px from edges (250px width / 2 + margin)
                                                    const left = Math.min(window.innerWidth - 135, Math.max(135, rect.left + rect.width / 2));
                                                    setPopoverPos({
                                                        top: showBelow ? rect.bottom + 10 : rect.top - 10,
                                                        left,
                                                        below: showBelow
                                                    });
                                                    setHoveredImageId(img.id);
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredImageId(null);
                                                    setPopoverPos(null);
                                                }}
                                                onClick={() => setSelectedImageId(img.id)}
                                            >
                                                <div
                                                    className="thumbnail-img-container"
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', img.path);
                                                        e.dataTransfer.setData('application/json', JSON.stringify(img));
                                                    }}
                                                >
                                                    <img
                                                        src={getAssetUrl(img.path)}
                                                        alt={img.name}
                                                        className="thumbnail-img"
                                                        loading="lazy"
                                                    />
                                                </div>
                                                {hoveredImageId === img.id && popoverPos && (
                                                    <div
                                                        className={`hover-popover ${popoverPos.below ? 'below' : ''}`}
                                                        style={{
                                                            top: popoverPos.below ? popoverPos.top : 'auto',
                                                            bottom: !popoverPos.below ? (window.innerHeight - popoverPos.top) : 'auto',
                                                            left: popoverPos.left,
                                                            transform: 'translateX(-50%)'
                                                        }}
                                                    >
                                                        <img src={getAssetUrl(img.path)} alt="preview" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default IngestionArea;

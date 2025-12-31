import React from 'react';
import { MdImage, MdRefresh } from 'react-icons/md';
import { useIngestionStore } from '../../store/useIngestionStore';
import type { IngestedImage } from '../../types/images';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useKeyboardAssignment } from '../../hooks/useKeyboardAssignment';

// Sub-components
import { BurstGroup } from './components/BurstGroup';

export const IngestionArea: React.FC = React.memo(() => {
    const images = useIngestionStore(s => s.images);
    const cycleLabel = useIngestionStore(s => s.cycleLabel);
    const resetLabel = useIngestionStore(s => s.resetLabel);
    const isDiscovering = useIngestionStore(s => s.isDiscovering);

    const [activeSource, setActiveSource] = React.useState('all');
    const [visibleCount, setVisibleCount] = React.useState(15);
    const isScrollingRef = React.useRef(false);
    const scrollEndTimerRef = React.useRef<any>(null);
    const lastMousePosRef = React.useRef({ x: 0, y: 0 });
    const sentinelRef = React.useRef<HTMLDivElement>(null);

    const { t } = useTranslation();
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);
    const watchedFolders = useSettingsStore(s => s.watchedFolders);

    useKeyboardAssignment();

    const handleHoverAt = React.useCallback((x: number, y: number) => {
        if (isScrollingRef.current) return;

        const target = document.elementFromPoint(x, y)?.closest('.thumbnail-wrapper');
        if (target) {
            const id = target.getAttribute('data-image-id');
            const state = useIngestionStore.getState();
            if (id && id !== state.hoveredImageId) {
                const rect = target.getBoundingClientRect();
                const showBelow = rect.top < 250;
                const left = Math.min(window.innerWidth - 260, Math.max(260, rect.left + rect.width / 2));

                state.setHover(id, {
                    top: showBelow ? rect.bottom + 10 : rect.top - 10,
                    left,
                    below: showBelow
                });
            }
        } else {
            if (useIngestionStore.getState().hoveredImageId) {
                useIngestionStore.getState().setHover(null, null);
            }
        }
    }, []);

    const sources = React.useMemo(() => {
        const unique = Array.from(new Set(images.map(img => img.source)));
        return ['all', ...unique];
    }, [images]);

    const filteredImages = React.useMemo(() => {
        const now = Date.now();
        const lookbackMs = ingestLookbackDays * 24 * 60 * 60 * 1000;

        return images.filter(img => {
            const matchesSource = activeSource === 'all' || img.source === activeSource;
            const matchesTime = (now - img.timestamp) <= lookbackMs;
            return matchesSource && matchesTime;
        });
    }, [images, activeSource, ingestLookbackDays]);

    React.useEffect(() => {
        if (activeSource !== 'all' && !sources.includes(activeSource)) {
            setActiveSource('all');
        }
    }, [sources, activeSource]);

    const bursts = React.useMemo(() => {
        return filteredImages.reduce((acc, img) => {
            const lastBurst = acc[acc.length - 1];
            if (lastBurst && lastBurst[0].burstId === img.burstId) {
                lastBurst.push(img);
            } else {
                acc.push([img]);
            }
            return acc;
        }, [] as IngestedImage[][]);
    }, [filteredImages]);

    React.useEffect(() => {
        setVisibleCount(15);
    }, [activeSource]);

    React.useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisibleCount(prev => prev + 15);
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [bursts.length]);

    const visibleBursts = React.useMemo(() => bursts.slice(0, visibleCount), [bursts, visibleCount]);

    return (
        <section className="ingestion-area" id="tutorial-ingestion-area">
            <header className="area-header">
                <h2>{t('ingestion')}</h2>
                <span className="count-badge">{filteredImages.length}</span>
            </header>
            <div className="filter-bar">
                <div className="filter-pill-container scrollable-hidden">
                    {sources.map(src => {
                        const isAll = src === 'all';
                        const folder = watchedFolders.find(f => f.path === src);
                        const label = isAll ? t('all') : (folder ? folder.alias : (src.split(/[\\/]/).pop() || src));

                        return (
                            <button
                                key={src}
                                className={`filter-pill ${activeSource === src ? 'active' : ''}`}
                                onClick={() => setActiveSource(src)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div
                className="area-body"
                onScroll={() => {
                    isScrollingRef.current = true;
                    if (useIngestionStore.getState().hoveredImageId) {
                        useIngestionStore.getState().setHover(null, null);
                    }

                    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
                    scrollEndTimerRef.current = setTimeout(() => {
                        isScrollingRef.current = false;
                        handleHoverAt(lastMousePosRef.current.x, lastMousePosRef.current.y);
                    }, 150);
                }}
            >
                {bursts.length === 0 ? (
                    <div className="empty-state-container">
                        {isDiscovering ? (
                            <>
                                <MdRefresh size={128} className="empty-state-icon spinner-icon" />
                                <h3 className="empty-state-title">{t('discovering_images')}</h3>
                                <p className="empty-state-description">{t('discovering_desc')}</p>
                            </>
                        ) : (
                            <>
                                <MdImage size={128} className="empty-state-icon" />
                                <h3 className="empty-state-title">{t('no_images')}</h3>
                                <p className="empty-state-description">{t('folders_desc')}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div
                        className="burst-container"
                        onMouseMove={(e) => {
                            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                            if (isScrollingRef.current) return;
                            handleHoverAt(e.clientX, e.clientY);
                        }}
                        onMouseOver={(e) => {
                            if (isScrollingRef.current) return;
                            const target = (e.target as HTMLElement).closest('.thumbnail-wrapper');
                            if (target) {
                                handleHoverAt(e.clientX, e.clientY);
                            }
                        }}
                        onMouseOut={(e) => {
                            const related = e.relatedTarget as HTMLElement;
                            if (!related || !related.closest('.burst-container')) {
                                useIngestionStore.getState().setHover(null, null);
                            }
                        }}
                    >
                        {isDiscovering && (
                            <div className="top-loading-indicator">
                                <MdRefresh size={20} className="spinner-icon" />
                                <span>{t('discovering_more')}</span>
                            </div>
                        )}
                        {visibleBursts.map((burst, index) => (
                            <BurstGroup
                                key={burst[0].burstId}
                                burst={burst}
                                cycleLabel={cycleLabel}
                                resetLabel={resetLabel}
                                priority={index < 3}
                            />
                        ))}
                    </div>
                )}
                {visibleCount < bursts.length && (
                    <div ref={sentinelRef} className="progressive-mount-sentinel">
                        <div className="spinner-mini" />
                    </div>
                )}
            </div>
        </section>
    );
});

export default IngestionArea;

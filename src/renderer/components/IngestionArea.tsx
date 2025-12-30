import React from 'react';
import clsx from 'clsx';
import { MdBolt, MdImage } from 'react-icons/md';
import { useIngestionStore } from '../store/useIngestionStore';
import type { IngestedImage } from '../types/images';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getThumbnailUrl } from '../utils/pathUtils';

import { useDraggable } from '@dnd-kit/core';
import { thumbnailManager } from '../utils/thumbnailManager';

import { useStoryStore } from '../store/useStoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { type PlatformKey } from '../types/stories';
import { useKeyboardAssignment } from '../hooks/useKeyboardAssignment';

const ImagePlacementIndicator: React.FC<{ imageId: string }> = ({ imageId }) => {
    const posts = useStoryStore(s => s.posts);
    const activePostId = useStoryStore(s => s.activePostId);

    const activeSlots = React.useMemo(() => {
        const activePost = posts.find(p => p.id === activePostId);
        if (!activePost) return [];
        const activePlatform = activePost.platforms[activePost.activePlatform];
        return activePlatform.slots
            .map((s, idx) => s.imageId === imageId ? idx + 1 : null)
            .filter((idx): idx is number => idx !== null);
    }, [posts, activePostId, imageId]);

    const isInOther = React.useMemo(() => {
        // If it's already in the active post, we don't necessarily need the "other" dot
        // unless you want to see if it's ALSO in other posts. 
        // Let's keep it simple: show active slots, or show "other" if not in active but in ANY.
        if (activeSlots.length > 0) return false;

        for (const post of posts) {
            for (const platformKey of (Object.keys(post.platforms) as PlatformKey[])) {
                if (post.id === activePostId && platformKey === posts.find(p => p.id === activePostId)?.activePlatform) continue;

                const config = post.platforms[platformKey];
                if (config && config.slots.some((s: any) => s?.imageId === imageId)) {
                    return true;
                }
            }
        }
        return false;
    }, [posts, activePostId, activeSlots, imageId]);

    if (activeSlots.length === 0 && !isInOther) return null;

    return (
        <div className="placement-container">
            {activeSlots.map(slot => (
                <div key={slot} className="placement-indicator active-badge">
                    {slot}
                </div>
            ))}
            {isInOther && (
                <div className="placement-indicator other-dot" />
            )}
        </div>
    );
};

const LazyImage: React.FC<{
    src: string,
    alt: string,
    className?: string,
    onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}> = ({ src, alt, className, onLoad }) => {
    const [isNear, setIsNear] = React.useState(false); // Zone for requesting load
    const [isResident, setIsResident] = React.useState(false); // Zone for keeping in RAM
    const [isLoadAllowed, setIsLoadAllowed] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);
    const requestIdRef = React.useRef<string | null>(null);
    const slotOwnedRef = React.useRef(false);

    const releaseSlot = () => {
        if (slotOwnedRef.current) {
            thumbnailManager.notifyFinished(src);
            slotOwnedRef.current = false;
        }
    };

    React.useEffect(() => {
        if (!imgRef.current) return;
        const scrollContainer = imgRef.current.closest('.area-body');

        // Observer for Loading (3 screens buffer)
        const loadObserver = new IntersectionObserver(([entry]) => {
            setIsNear(entry.isIntersecting);
        }, {
            root: scrollContainer,
            rootMargin: '300% 0px'
        });

        // Observer for Unloading (10 screens buffer - very conservative)
        const unloadObserver = new IntersectionObserver(([entry]) => {
            setIsResident(entry.isIntersecting);
            if (!entry.isIntersecting) {
                setIsLoadAllowed(false);
                releaseSlot();
                // Also cancel if it was still pending
                if (requestIdRef.current) {
                    thumbnailManager.cancelLoad(requestIdRef.current);
                    requestIdRef.current = null;
                }
            }
        }, {
            root: scrollContainer,
            rootMargin: '1000% 0px'
        });

        loadObserver.observe(imgRef.current);
        unloadObserver.observe(imgRef.current);

        return () => {
            loadObserver.disconnect();
            unloadObserver.disconnect();
            releaseSlot();
            if (requestIdRef.current) {
                thumbnailManager.cancelLoad(requestIdRef.current);
            }
        };
    }, []);

    // Load Management Integration
    React.useEffect(() => {
        // If we enter the "Near" zone and aren't loaded yet
        if (isNear && isResident && !isLoadAllowed && !requestIdRef.current) {
            const { id, promise } = thumbnailManager.requestLoad(src, 10);
            requestIdRef.current = id;

            promise.then(() => {
                // If we are still resident when the slot opens, allow the load
                if (requestIdRef.current === id) {
                    setIsLoadAllowed(true);
                    slotOwnedRef.current = true;
                    requestIdRef.current = null;
                } else {
                    // We were cancelled but got a slot anyway, return it immediately
                    thumbnailManager.notifyFinished(src);
                }
            });
        }
        // If we leave the "Near" zone but are still resident, we can cancel the PENDING load
        else if (!isNear && requestIdRef.current) {
            thumbnailManager.cancelLoad(requestIdRef.current);
            requestIdRef.current = null;
        }
    }, [isNear, isResident, isLoadAllowed, src]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        releaseSlot();
        if (onLoad) onLoad(e);
    };

    const handleError = () => {
        releaseSlot();
    };

    return (
        <img
            ref={imgRef}
            src={isLoadAllowed ? src : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
            alt={alt}
            className={className}
            onLoad={isLoadAllowed ? handleLoad : undefined}
            onError={isLoadAllowed ? handleError : undefined}
            loading="lazy"
            draggable={false}
        />
    );
};

const ImageThumbnail: React.FC<{
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
        setLockout(false); // Reset lockout on new interaction
        if (e.button === 0) { // Left click: Start hold timer
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
                }
            }, 30);
        } else if (e.button === 2) { // Right click: existing logic
            wasResetRef.current = false;
            timerRef.current = setTimeout(() => {
                onReset();
                wasResetRef.current = true;
            }, 500);
        }
    };

    const handleMouseMove = (e: React.PointerEvent) => {
        if (isDragging) return; // Library is in control
        if ((isNativeReady || lockout) && !hasTriggeredDragRef.current) {
            e.preventDefault();
            e.stopPropagation();
            // Threshold met: trigger native drag once
            hasTriggeredDragRef.current = true;
            window.electron.startDrag(img.path, '');
            // We do NOT reset holdProgress here, so the READY message stays visible
            if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        } else if (lockout) {
            // Still locked out, swallow events
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleMouseUp = (_e: React.PointerEvent) => {
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
        // Note: lockout persists until next handleMouseDown
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
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
                {holdProgress > 0 && (
                    <div className="native-drag-indicator">
                        <div className="progress-bar" style={{ width: `${holdProgress}%` }} />
                        {holdProgress >= 100 && <div className="ready-overlay">{t('ready_to_drag')}</div>}
                    </div>
                )}
                <div className="thumbnail-card">
                    <div className="thumbnail-placeholder">
                        <MdImage size={32} />
                    </div>
                    <LazyImage
                        src={getThumbnailUrl(img.path)}
                        alt={img.name}
                        className="thumbnail-img"
                    />
                    <div className="label-glow"></div>
                    <div className="label-bar"></div>
                </div>
            </div>
        </motion.div>
    );
});

const BurstGroup: React.FC<{
    burst: IngestedImage[],
    cycleLabel: (id: string) => void,
    resetLabel: (id: string) => void
}> = React.memo(({ burst, cycleLabel, resetLabel }) => {
    const { t, i18n } = useTranslation();
    const selectedImageId = useIngestionStore(s => s.selectedImageId);
    const setSelectedImageId = useIngestionStore(s => s.setSelectedImageId);
    const groupRef = React.useRef<HTMLDivElement>(null);
    const [hasBeenVisible, setHasBeenVisible] = React.useState(false);

    React.useEffect(() => {
        if (!groupRef.current) return;
        const scrollContainer = groupRef.current.closest('.area-body');

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !hasBeenVisible) {
                setHasBeenVisible(true);
                // Pre-cache hover thumbnails for this group (low priority)
                burst.forEach(img => {
                    thumbnailManager.prefetch(getThumbnailUrl(img.path, 600), 100);
                });
            }
        }, {
            root: scrollContainer,
            rootMargin: '300% 0px'
        });

        observer.observe(groupRef.current);
        return () => observer.disconnect();
    }, [burst, hasBeenVisible]);

    return (
        <div ref={groupRef} className="burst-group">
            <div className="burst-header">
                <div className="burst-info-left">
                    <span className="burst-source">{burst[0].source}</span>
                    <span className="burst-date">
                        {(() => {
                            const date = new Date(burst[0].timestamp);
                            const now = new Date();
                            const isToday = date.toDateString() === now.toDateString();
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            const isYesterday = date.toDateString() === yesterday.toDateString();

                            if (isToday) return t('today');
                            if (isYesterday) return t('yesterday');
                            return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                        })()}
                    </span>
                </div>
                <span className="burst-time">
                    {new Date(burst[0].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div className="thumbnail-grid">
                <AnimatePresence>
                    {burst.map((img) => (
                        <ImageThumbnail
                            key={img.id}
                            img={img}
                            isSelected={selectedImageId === img.id}
                            onSelect={() => setSelectedImageId(img.id)}
                            onCycle={() => cycleLabel(img.id)}
                            onReset={() => resetLabel(img.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
});

export const HoverOverlay: React.FC = () => {
    const images = useIngestionStore(s => s.images);
    const hoveredImageId = useIngestionStore(s => s.hoveredImageId);
    const popoverPos = useIngestionStore(s => s.hoveredPopoverPos);

    const img = React.useMemo(() =>
        hoveredImageId ? images.find(i => i.id === hoveredImageId) : null
        , [images, hoveredImageId]);

    if (!img || !popoverPos) return null;

    return (
        <div
            className={clsx(
                "hover-popover",
                popoverPos.below && "below",
                img.labelIndex && `label-${img.labelIndex}`
            )}
            style={{
                left: popoverPos.left,
                top: popoverPos.below ? popoverPos.top : 'auto',
                bottom: !popoverPos.below ? (window.innerHeight - popoverPos.top) : 'auto',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                pointerEvents: 'none',
                opacity: 1
            }}
        >
            <div className="label-glow" />
            <img src={getThumbnailUrl(img.path, 600)} alt="preview" />
            <div className="label-bar" />
            <div className="hover-popover-info">
                <span className="hover-image-name">{img.name}</span>
            </div>
        </div>
    );
};

const IngestionArea: React.FC = React.memo(() => {
    const images = useIngestionStore(s => s.images);
    const cycleLabel = useIngestionStore(s => s.cycleLabel);
    const resetLabel = useIngestionStore(s => s.resetLabel);

    const [activeSource, setActiveSource] = React.useState('All');
    const [visibleCount, setVisibleCount] = React.useState(15);
    const isScrollingRef = React.useRef(false);
    const scrollEndTimerRef = React.useRef<any>(null);
    const lastMousePosRef = React.useRef({ x: 0, y: 0 });
    const sentinelRef = React.useRef<HTMLDivElement>(null);

    const { t } = useTranslation();
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);

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
            // Check if we were hovering something and clear it
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

    // Safeguard: if active source is removed, reset to All
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

    // Reset visible count when filters change
    React.useEffect(() => {
        setVisibleCount(15);
    }, [activeSource]);

    // Progressive mounting observer
    React.useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisibleCount(prev => prev + 15);
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [bursts.length]); // Re-attach when list changes

    const visibleBursts = React.useMemo(() => bursts.slice(0, visibleCount), [bursts, visibleCount]);

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
                            {src === 'all' ? t('all') : src}
                        </button>
                    ))}
                </div>
            </div>
            <div
                className="area-body"
                onScroll={() => {
                    isScrollingRef.current = true;
                    // Read state directly from store to avoid subscribing IngestionArea to hover changes
                    if (useIngestionStore.getState().hoveredImageId) {
                        useIngestionStore.getState().setHover(null, null);
                    }

                    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
                    scrollEndTimerRef.current = setTimeout(() => {
                        isScrollingRef.current = false;
                        // Re-evaluate what's under the mouse now that we've stopped
                        handleHoverAt(lastMousePosRef.current.x, lastMousePosRef.current.y);
                    }, 150);
                }}
            >
                {bursts.length === 0 ? (
                    <div className="ingestion-empty-state">
                        <MdImage size={128} className="empty-icon" />
                        <p>{t('no_images')}</p>
                        <span className="empty-hint">{t('folders_desc')}</span>
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
                        {visibleBursts.map((burst) => (
                            <BurstGroup
                                key={burst[0].burstId}
                                burst={burst}
                                cycleLabel={cycleLabel}
                                resetLabel={resetLabel}
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

export const BurstControl: React.FC = () => {
    const { t } = useTranslation();
    const burstThreshold = useSettingsStore(s => s.burstThreshold);
    const setBurstThresholdSetting = useSettingsStore(s => s.setBurstThreshold);
    const reBurst = useIngestionStore(s => s.reBurst);
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const thresholdSec = (burstThreshold / 1000).toFixed(1);

    return (
        <div className="burst-control-wrapper" ref={containerRef}>
            <button
                className={clsx("icon-btn-text", isOpen && "active")}
                onClick={() => setIsOpen(!isOpen)}
                title={t('burst_sensitivity')}
            >
                <MdBolt size={18} />
                <span>{t('burst')}: {thresholdSec}s</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="burst-popup"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                        <div className="popup-header">
                            <span className="popup-title">{t('burst_sensitivity')}</span>
                            <span className="popup-value">{thresholdSec}s</span>
                        </div>
                        <input
                            type="range"
                            min="500"
                            max="60000"
                            step="500"
                            value={burstThreshold}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setBurstThresholdSetting(val);
                                reBurst(val);
                            }}
                            className="burst-slider"
                        />
                        <div className="popup-hint">{t('time_between_groups')}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

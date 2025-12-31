import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useTranslation } from 'react-i18next';
import { PLATFORMS, LAYOUTS } from '../types/stories';
import type { ImageSlotData } from '../types/stories';
import { MdChevronLeft, MdChevronRight, MdAdd, MdDashboard, MdDelete, MdClose, MdBorderInner, MdGridGoldenratio } from 'react-icons/md';
import clsx from 'clsx';
import { useSettingsStore } from '../store/useSettingsStore';
import { GlobalCropOverlay } from './StoryBuilder/GlobalCropOverlay';
import { PreviewCanvas } from './StoryBuilder/PreviewCanvas';
import { AnimatePresence } from 'framer-motion';
import { getConstrainedPixelCrop } from '../utils/cropUtils';



const StoryBuilderArea: React.FC = () => {
    const { t } = useTranslation();
    const {
        posts,
        activePostId,
        addPost,
        removePost,
        setActivePostId,
        updatePostName,
        enablePlatform,
        setActivePlatform,
        updateLayout,
        updateSlotCrop
    } = useStoryStore();

    const { textPresets } = useSettingsStore();

    const [isPostListOpen, setIsPostListOpen] = React.useState(true);
    const [activeSlotRect, setActiveSlotRect] = React.useState<DOMRect | null>(null);
    const [isSymmetric, setIsSymmetric] = React.useState(true); // Default to symmetric
    const [isFitConstraint, setIsFitConstraint] = React.useState(true);
    const [activeEditingPostId, setActiveEditingPostId] = React.useState<string | null>(null);
    const [focusedSlotIndex, setFocusedSlotIndex] = React.useState<number | null>(null);

    // Transient ref to store latest crop data during active drag/pan to avoid stale closures
    const transientCropRef = React.useRef<{ pixelCrop: any, expansion: any } | null>(null);

    const activePost = posts.find(p => p.id === activePostId);
    const activePlatform = activePost ? activePost.platforms[activePost.activePlatform] : undefined;
    const focusedSlotData = focusedSlotIndex !== null && activePlatform ? activePlatform.slots[focusedSlotIndex] : null;

    const handleResizeExpansion = React.useCallback((newExp: ImageSlotData['crop']['expansion']) => {
        if (focusedSlotIndex === null || !focusedSlotData || !activeSlotRect || !activePost) return;

        const oldExp = focusedSlotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
        const oldW = activeSlotRect.width + oldExp.left + oldExp.right;
        const oldH = activeSlotRect.height + oldExp.top + oldExp.bottom;
        const newW = activeSlotRect.width + newExp.left + newExp.right;
        const newH = activeSlotRect.height + newExp.top + newExp.bottom;

        if (oldW <= 0 || oldH <= 0 || newW <= 0 || newH <= 0) return;

        const imgW = focusedSlotData.originalWidth || oldW;
        const imgH = focusedSlotData.originalHeight || oldH;
        const imgAspect = imgW / imgH;

        // Calculate base width (physical width at scale=1) for both geometries
        const oldBaseW = Math.max(oldW, oldH * imgAspect);
        const newBaseW = Math.max(newW, newH * imgAspect);

        // Compensate scale so physical image size stays constant
        const newScale = focusedSlotData.crop.scale * (oldBaseW / newBaseW);

        // Compensate x/y so physical image position in viewport stays constant
        const oldXpx = (focusedSlotData.crop.x / 100) * oldW;
        const oldYpx = (focusedSlotData.crop.y / 100) * oldH;

        const centerInSlotX = (oldW / 2) + oldXpx - oldExp.left;
        const centerInSlotY = (oldH / 2) + oldYpx - oldExp.top;

        const newXpx = centerInSlotX + newExp.left - (newW / 2);
        const newYpx = centerInSlotY + newExp.top - (newH / 2);

        const newX = (newXpx / newW) * 100;
        const newY = (newYpx / newH) * 100;

        updateSlotCrop(activePostId!, activePost.activePlatform, focusedSlotIndex, {
            ...focusedSlotData.crop,
            expansion: newExp,
            scale: newScale,
            x: newX,
            y: newY
        });
    }, [activePostId, activePost?.activePlatform, focusedSlotIndex, focusedSlotData, activeSlotRect, updateSlotCrop]);

    const hashtags = React.useMemo(() => {
        const allText = posts.flatMap(p => Object.values(p.platforms).map(pl => pl.text)).join(' ');
        const matches = allText.match(/#[\p{L}\p{N}_]+/gu) || [];
        const counts: Record<string, number> = {};
        matches.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });

        const common = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([tag]) => tag);

        const defaults = ['#marchphotobox'];
        return Array.from(new Set([...common, ...defaults])).slice(0, 10);
    }, [posts]);

    if (!activePostId || !activePost) {
        return (
            <section className="story-builder-area">
                <div className="empty-state-container">
                    <MdDashboard size={128} className="empty-state-icon" />
                    <h3 className="empty-state-title">{t('no_posts_title')}</h3>
                    <p className="empty-state-description">{t('create_your_first')}</p>
                    <button className="empty-state-cta-btn" onClick={() => addPost(t('story') + ' ' + (posts.length + 1))}>
                        <MdAdd size={20} />
                        {t('create_new_story')}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="story-builder-area" id="tutorial-story-builder-area">
            <GlobalCropOverlay
                activeSlotRect={activeSlotRect}
                crop={focusedSlotData?.crop || null}
                originalWidth={focusedSlotData?.originalWidth}
                originalHeight={focusedSlotData?.originalHeight}
                onResizeExpansion={handleResizeExpansion}
                onDeselect={() => setFocusedSlotIndex(null)}
            />
            {/* Top Navigation - Platform Tabs */}
            <header className="builder-header">
                <div className="builder-header-left">
                    <h1>{t('story_builder')}</h1>
                    <div className="platform-tabs" id="tutorial-platform-tabs">
                        {PLATFORMS.filter(p => useSettingsStore.getState().enabledPlatformKeys.includes(p.key)).map(p => {
                            const isEnabled = activePost.platforms[p.key].enabled;
                            const isActive = activePost.activePlatform === p.key;
                            return (
                                <div key={p.key} className="platform-tab-wrapper">
                                    {!isActive && isEnabled && (
                                        <button
                                            className="platform-enable-btn close-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useStoryStore.getState().setPlatformEnabled(activePostId, p.key, false);
                                            }}
                                            title={t('disable_platform')}
                                        >
                                            <MdClose size={12} />
                                        </button>
                                    )}
                                    <button
                                        className={clsx("platform-tab", isActive && "active", !isEnabled && "disabled")}
                                        onClick={() => isActive ? null : (isEnabled ? setActivePlatform(activePostId, p.key) : enablePlatform(activePostId, p.key))}
                                    >
                                        <span className="platform-icon" style={{ backgroundColor: p.color }} />
                                        {t(p.key as any)}
                                    </button>
                                    {!isActive && (
                                        <button
                                            className={clsx("platform-enable-btn", isEnabled && "is-enabled")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                enablePlatform(activePostId, p.key);
                                            }}
                                            title={isEnabled ? t('copy_to_platform') : t('enable_platform')}
                                        >
                                            <MdAdd size={12} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="header-actions">
                    <button className="placeholder-post-btn" id="tutorial-post-story-btn" onClick={() => {
                        useStoryStore.getState().finalizeCrops(activePostId);
                        useStoryStore.getState().setPostMode(true);
                    }}>
                        {t('post_story')}
                    </button>
                </div>
            </header>

            <div className="builder-workspace">
                {/* Left Side - Layout Selector (Expanded) */}
                <aside className="layout-sidebar">
                    {LAYOUTS.map(l => (
                        <button
                            key={l.key}
                            className={clsx("layout-btn", activePlatform!.layout === l.key && "active")}
                            onClick={() => updateLayout(activePostId, activePost.activePlatform, l.key)}
                        >
                            <div className={clsx("layout-icon-preview", l.key)} />
                            <span className="layout-btn-label">{t(`layout_${l.key}` as any)}</span>
                        </button>
                    ))}
                </aside>

                {/* Center - Preview Canvas & Metadata Footer */}
                <div className="builder-main-view">
                    <div className="metadata-overlay-container">
                        <div className="metadata-chips-group">
                            <span className="meta-group-label">{t('presets')}</span>
                            <div className="chips-row">
                                {textPresets.map(preset => (
                                    <button key={preset.id} className="preset-chip" onClick={() => {
                                        const currentText = activePost.platforms[activePost.activePlatform].text;
                                        if (!currentText.includes(preset.content)) {
                                            useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${preset.content} `.trim());
                                        }
                                    }}>
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="metadata-chips-group">
                            <span className="meta-group-label">{t('hashtags')}</span>
                            <div className="chips-row">
                                {hashtags.map(tag => (
                                    <button key={tag} className="hashtag-chip" onClick={() => {
                                        const currentText = activePost.platforms[activePost.activePlatform].text;
                                        if (!currentText.includes(tag)) {
                                            useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${tag} `.trim());
                                        }
                                    }}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="area-body scrollable" onClick={(e) => {
                        if (e.target === e.currentTarget || (e.target as Element).classList.contains('area-body')) {
                            setFocusedSlotIndex(null);
                        }
                    }}>
                        <div className="mockup-feed-container">
                            <div className="placeholder-post feed-above">
                                <div className="placeholder-post-header">
                                    <div className="placeholder-pfp" />
                                    <div className="placeholder-name-bar" />
                                </div>
                                <div className="placeholder-content-box" />
                            </div>
                            <PreviewCanvas
                                postId={activePostId}
                                platform={activePost.activePlatform}
                                focusedSlotIndex={focusedSlotIndex}
                                onFocusSlot={(idx, rect) => {
                                    setFocusedSlotIndex(idx);
                                    setActiveSlotRect(rect);
                                }}
                                onDeselect={() => setFocusedSlotIndex(null)}
                            />

                            <GlobalCropOverlay
                                activeSlotRect={activeSlotRect}
                                crop={focusedSlotData?.crop || null}
                                originalWidth={focusedSlotData?.originalWidth}
                                originalHeight={focusedSlotData?.originalHeight}
                                onResizeExpansion={(newExp) => {
                                    if (focusedSlotIndex !== null) {
                                        transientCropRef.current = null; // Clear ref on final update
                                        updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                            ...focusedSlotData!.crop,
                                            expansion: newExp
                                        });
                                    }
                                }}
                                onDeselect={() => {
                                    transientCropRef.current = null;
                                    setFocusedSlotIndex(null);
                                }}
                                isSymmetric={isSymmetric}
                                onToggleSymmetry={() => setIsSymmetric(!isSymmetric)}
                                isFitConstraint={isFitConstraint}
                                onPan={(dx: number, dy: number) => {
                                    if (focusedSlotIndex === null || !focusedSlotData || !activeSlotRect) return;

                                    // Initialize transient ref if not already set
                                    if (!transientCropRef.current) {
                                        transientCropRef.current = {
                                            pixelCrop: focusedSlotData.crop.pixelCrop,
                                            expansion: focusedSlotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 }
                                        };
                                    }

                                    const aspect = activeSlotRect.width / activeSlotRect.height;
                                    const { pixelCrop: newPixelCrop, expansion: newExpansion } = getConstrainedPixelCrop(
                                        transientCropRef.current.pixelCrop!,
                                        transientCropRef.current.expansion,
                                        focusedSlotData.originalWidth!,
                                        focusedSlotData.originalHeight!,
                                        aspect,
                                        dx,
                                        dy,
                                        1,
                                        isSymmetric
                                    );

                                    // Update ref for NEXT call in same drag
                                    transientCropRef.current = { pixelCrop: newPixelCrop, expansion: newExpansion };

                                    updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                        ...focusedSlotData.crop,
                                        pixelCrop: newPixelCrop,
                                        expansion: newExpansion
                                    });
                                }}
                                onZoom={(factor: number) => {
                                    if (focusedSlotIndex === null || !focusedSlotData || !activeSlotRect) return;

                                    if (!transientCropRef.current) {
                                        transientCropRef.current = {
                                            pixelCrop: focusedSlotData.crop.pixelCrop,
                                            expansion: focusedSlotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 }
                                        };
                                    }

                                    const aspect = activeSlotRect.width / activeSlotRect.height;
                                    const imgW = focusedSlotData.originalWidth!;
                                    const imgH = focusedSlotData.originalHeight!;

                                    const { pixelCrop: newPixelCrop } = getConstrainedPixelCrop(
                                        transientCropRef.current.pixelCrop!,
                                        transientCropRef.current.expansion,
                                        imgW,
                                        imgH,
                                        aspect,
                                        0,
                                        0,
                                        factor,
                                        isSymmetric
                                    );

                                    const actualFactor = newPixelCrop.width / transientCropRef.current.pixelCrop.width;
                                    const oldExp = transientCropRef.current.expansion;
                                    const rawExpansion = {
                                        top: oldExp.top * actualFactor,
                                        right: oldExp.right * actualFactor,
                                        bottom: oldExp.bottom * actualFactor,
                                        left: oldExp.left * actualFactor
                                    };

                                    // Clamp expansion to available space
                                    const topSpace = newPixelCrop.y;
                                    const bottomSpace = imgH - (newPixelCrop.y + newPixelCrop.height);
                                    const leftSpace = newPixelCrop.x;
                                    const rightSpace = imgW - (newPixelCrop.x + newPixelCrop.width);

                                    const newExpansion = {
                                        top: Math.max(0, Math.min(rawExpansion.top, topSpace)),
                                        bottom: Math.max(0, Math.min(rawExpansion.bottom, bottomSpace)),
                                        left: Math.max(0, Math.min(rawExpansion.left, leftSpace)),
                                        right: Math.max(0, Math.min(rawExpansion.right, rightSpace))
                                    };

                                    transientCropRef.current = { pixelCrop: newPixelCrop, expansion: newExpansion };
                                    const newScale = imgW / newPixelCrop.width;

                                    updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                        ...focusedSlotData.crop,
                                        pixelCrop: newPixelCrop,
                                        expansion: newExpansion,
                                        scale: newScale
                                    });
                                }}
                            />

                            <AnimatePresence>
                                {focusedSlotIndex !== null && (
                                    <>
                                        <div className="top-bar-full">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <button
                                                    className={clsx("icon-btn", isSymmetric && "active")}
                                                    onClick={() => setIsSymmetric(!isSymmetric)}
                                                    title="Symmetric Mode (S)"
                                                >
                                                    <MdBorderInner size={24} />
                                                </button>

                                                <button
                                                    className={clsx("icon-btn", isFitConstraint && "active")}
                                                    onClick={() => setIsFitConstraint(!isFitConstraint)}
                                                    title="Axis Constraint (A)"
                                                >
                                                    <MdGridGoldenratio size={24} />
                                                </button>
                                            </div>

                                            <button
                                                className="icon-btn-large"
                                                onClick={() => setFocusedSlotIndex(null)}
                                                title="Close (ESC)"
                                            >
                                                <MdClose size={24} />
                                            </button>
                                        </div>

                                        {/* Bottom Zoom Pill */}
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
                                                    value={focusedSlotData?.crop?.scale || 1}
                                                    onChange={(e) => {
                                                        if (focusedSlotIndex === null || !focusedSlotData || !activeSlotRect) return;
                                                        const newScale = parseFloat(e.target.value);
                                                        const currentScale = focusedSlotData.crop.scale || 1;
                                                        const eventFactor = newScale / currentScale;

                                                        // Call the onZoom logic directly since we are in the same component
                                                        const aspect = activeSlotRect.width / activeSlotRect.height;
                                                        const pc = transientCropRef.current?.pixelCrop || focusedSlotData.crop.pixelCrop;
                                                        const exp = transientCropRef.current?.expansion || focusedSlotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };

                                                        const { pixelCrop: newPixelCrop } = getConstrainedPixelCrop(
                                                            pc,
                                                            exp,
                                                            focusedSlotData.originalWidth!,
                                                            focusedSlotData.originalHeight!,
                                                            aspect,
                                                            0,
                                                            0,
                                                            eventFactor,
                                                            isSymmetric
                                                        );

                                                        const actualFactor = newPixelCrop.width / pc.width;
                                                        const newExp = {
                                                            top: exp.top * actualFactor,
                                                            right: exp.right * actualFactor,
                                                            bottom: exp.bottom * actualFactor,
                                                            left: exp.left * actualFactor
                                                        };

                                                        transientCropRef.current = { pixelCrop: newPixelCrop, expansion: newExp };
                                                        const updatedScale = focusedSlotData.originalWidth! / newPixelCrop.width;

                                                        updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                                            ...focusedSlotData.crop,
                                                            pixelCrop: newPixelCrop,
                                                            expansion: newExp,
                                                            scale: updatedScale
                                                        });
                                                    }}
                                                    className="zoom-slider-input"
                                                />
                                                <span className="zoom-percent">{(focusedSlotData?.crop?.scale || 1).toFixed(1)}x</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </AnimatePresence>

                            <div className="placeholder-post feed-below">
                                <div className="placeholder-post-header">
                                    <div className="placeholder-pfp" />
                                    <div className="placeholder-name-bar" />
                                </div>
                                <div className="placeholder-content-box" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Post Manager */}
                <aside className={clsx("post-sidebar", !isPostListOpen && "collapsed")}>
                    <button className="collapse-btn" onClick={() => setIsPostListOpen(!isPostListOpen)}>
                        {isPostListOpen ? <MdChevronRight size={16} /> : <MdChevronLeft size={16} />}
                    </button>

                    <div className="post-sidebar-content">
                        <div className="sidebar-header">
                            <h3>{t('stories')}</h3>
                            <button className="sidebar-add-btn" onClick={() => addPost(t('story') + ' ' + (posts.length + 1))}>
                                <MdAdd size={18} />
                            </button>
                        </div>
                        <div className="post-list scrollable">
                            {posts.map(p => {
                                const isActive = p.id === activePostId;
                                const isEditing = activeEditingPostId === p.id;

                                return (
                                    <div
                                        key={p.id}
                                        className={clsx("post-item", isActive && "active")}
                                        onClick={() => {
                                            if (!isActive) {
                                                setActivePostId(p.id);
                                                setActiveEditingPostId(null);
                                            } else {
                                                setActiveEditingPostId(p.id);
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                className="post-name-input"
                                                value={p.name}
                                                onChange={(e) => updatePostName(p.id, e.target.value)}
                                                onBlur={() => setActiveEditingPostId(null)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') setActiveEditingPostId(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="post-name-text">{p.name}</span>
                                        )}
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePost(p.id);
                                            }}
                                        >
                                            <MdDelete size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default StoryBuilderArea;

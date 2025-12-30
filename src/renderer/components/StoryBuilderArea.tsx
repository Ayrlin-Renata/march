import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useTranslation } from 'react-i18next';
import { PLATFORMS, LAYOUTS } from '../types/stories';
import type { ImageSlotData } from '../types/stories';
import { MdAdd, MdDashboard, MdChevronRight, MdChevronLeft, MdDelete } from 'react-icons/md';
import clsx from 'clsx';
import { useSettingsStore } from '../store/useSettingsStore';
import { GlobalCropOverlay } from './StoryBuilder/GlobalCropOverlay';
import { PreviewCanvas } from './StoryBuilder/PreviewCanvas';
import { clampCrop } from '../utils/cropUtils';
import { AnimatePresence, motion } from 'framer-motion';


const CropZoomSlider: React.FC<{
    scale: number,
    onChange: (newScale: number) => void
}> = ({ scale, onChange }) => {
    // Note: 10^((val-50)/50) gives 0.1 at 0, 1 at 50, 10 at 100.
    const logScaleMap = (v: number) => Math.pow(10, (v - 50) / 50);
    const logValMap = (s: number) => Math.log10(s) * 50 + 50;

    return (
        <motion.div
            className="crop-zoom-slider-container glassy"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onClick={(e) => e.stopPropagation()}
        >
            <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={logValMap(scale)}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChange(logScaleMap(val));
                }}
                className="zoom-slider-input"
            />
            <span className="zoom-percent">{scale.toFixed(1)}x</span>
        </motion.div>
    );
};


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
    const [activeEditingPostId, setActiveEditingPostId] = React.useState<string | null>(null);
    const [focusedSlotIndex, setFocusedSlotIndex] = React.useState<number | null>(null);

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
        const matches = allText.match(/#\w+/g) || [];
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
        <section className="story-builder-area">
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
                    <div className="platform-tabs">
                        {PLATFORMS.filter(p => useSettingsStore.getState().enabledPlatformKeys.includes(p.key)).map(p => {
                            const isEnabled = activePost.platforms[p.key].enabled;
                            const isActive = activePost.activePlatform === p.key;
                            return (
                                <div key={p.key} className="platform-tab-wrapper">
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
                    <button className="placeholder-post-btn" onClick={() => {
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
                                            useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${preset.content}`.trim());
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
                                            useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${tag}`.trim());
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

                            <AnimatePresence>
                                {focusedSlotIndex !== null && focusedSlotData && (
                                    <CropZoomSlider
                                        scale={focusedSlotData.crop.scale}
                                        onChange={(newScale) => {
                                            const exp = focusedSlotData.crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
                                            const blueBoxW = (activeSlotRect?.width || 0) + exp.left + exp.right;
                                            const blueBoxH = (activeSlotRect?.height || 0) + exp.top + exp.bottom;

                                            const clamped = clampCrop(
                                                focusedSlotData.originalWidth || 0,
                                                focusedSlotData.originalHeight || 0,
                                                blueBoxW,
                                                blueBoxH,
                                                newScale,
                                                focusedSlotData.crop
                                            );

                                            updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                                ...focusedSlotData.crop,
                                                scale: newScale,
                                                x: clamped.x,
                                                y: clamped.y
                                            });
                                        }}
                                    />
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

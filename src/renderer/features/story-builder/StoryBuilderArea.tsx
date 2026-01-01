import React from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDashboard, MdDelete, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getConstrainedPixelCrop } from '../../utils/cropUtils';
import type { ImageSlotData } from '../../types/stories';
import clsx from 'clsx';

// Components
import { GlobalCropOverlay } from './components/GlobalCropOverlay';
import { PreviewCanvas } from './components/PreviewCanvas';
import { BuilderHeader } from './components/BuilderHeader';
import { LayoutSidebar } from './components/LayoutSidebar';
import { MetadataOverlay } from './components/MetadataOverlay';

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

    const [activeSlotRect, setActiveSlotRect] = React.useState<DOMRect | null>(null);
    const [isSymmetric, setIsSymmetric] = React.useState(true);
    const [isFitConstraint, setIsFitConstraint] = React.useState(true);
    const [isPostListOpen, setIsPostListOpen] = React.useState(true);
    const [focusedSlotIndex, setFocusedSlotIndex] = React.useState<number | null>(null);
    const [activeEditingPostId, setActiveEditingPostId] = React.useState<string | null>(null);

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

        const oldBaseW = Math.max(oldW, oldH * imgAspect);
        const newBaseW = Math.max(newW, newH * imgAspect);

        const newScale = focusedSlotData.crop.scale * (oldBaseW / newBaseW);

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
            <BuilderHeader
                activePostId={activePostId}
                activePost={activePost}
                setActivePlatform={setActivePlatform}
                enablePlatform={enablePlatform}
            />

            <div className="builder-workspace">
                <LayoutSidebar
                    activePostId={activePostId}
                    activePost={activePost}
                    activePlatform={activePlatform}
                    updateLayout={updateLayout}
                />

                <div className="builder-main-view">
                    <MetadataOverlay
                        activePostId={activePostId}
                        activePost={activePost}
                        textPresets={textPresets}
                        hashtags={hashtags}
                    />

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
                                    transientCropRef.current = null;
                                    handleResizeExpansion(newExp);
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
                                        1, // zoomFactor
                                        isSymmetric
                                    );

                                    // Update ref for NEXT call in same drag to prevent rubber banding
                                    transientCropRef.current = { pixelCrop: newPixelCrop, expansion: newExpansion };

                                    // Direct update to store for performance (bypass React state during pan)
                                    useStoryStore.getState().updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
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

                                    const { pixelCrop: newPixelCrop, expansion: newExpansion } = getConstrainedPixelCrop(
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

                                    transientCropRef.current = { pixelCrop: newPixelCrop, expansion: newExpansion };
                                    const newScale = imgW / newPixelCrop.width;

                                    updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                                        ...focusedSlotData.crop,
                                        scale: newScale,
                                        pixelCrop: newPixelCrop,
                                        expansion: newExpansion
                                    });
                                }}
                                onToggleFit={() => setIsFitConstraint(!isFitConstraint)}
                            />

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

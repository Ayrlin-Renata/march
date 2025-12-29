import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useTranslation } from 'react-i18next';
import { PLATFORMS, LAYOUTS } from '../types/stories';
import { MdAdd, MdDashboard, MdChevronRight, MdChevronLeft, MdDelete } from 'react-icons/md';
import clsx from 'clsx';
import { useSettingsStore } from '../store/useSettingsStore';
import { GlobalCropOverlay } from './StoryBuilder/GlobalCropOverlay';
import { PreviewCanvas } from './StoryBuilder/PreviewCanvas';


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

    if (!activePostId || !activePost) {
        return (
            <section className="story-builder-area empty">
                <div className="empty-state">
                    <MdDashboard size={48} className="empty-icon" />
                    <h3>No Stories Yet</h3>
                    <p>Start by creating your first story to organize your images.</p>
                    <button className="new-story-btn-large" onClick={() => addPost()}>
                        <MdAdd size={24} />
                        Create New Story
                    </button>
                </div>
            </section>
        );
    }

    const activePlatform = activePost.platforms[activePost.activePlatform];
    const focusedSlotData = focusedSlotIndex !== null ? activePlatform.slots[focusedSlotIndex] : null;

    return (
        <section className="story-builder-area">
            <GlobalCropOverlay
                activeSlotRect={activeSlotRect}
                crop={focusedSlotData?.crop || null}
                originalWidth={focusedSlotData?.originalWidth}
                originalHeight={focusedSlotData?.originalHeight}
                onResizeExpansion={(newExp) => {
                    if (focusedSlotIndex !== null && focusedSlotData) {
                        updateSlotCrop(activePostId, activePost.activePlatform, focusedSlotIndex, {
                            ...focusedSlotData.crop,
                            expansion: newExp
                        });
                    }
                }}
                onDeselect={() => setFocusedSlotIndex(null)}
            />
            {/* Top Navigation - Platform Tabs */}
            <header className="builder-header">
                <div className="builder-header-left">
                    <h1>Story Builder</h1>
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
                                        {p.name}
                                    </button>
                                    {!isActive && (
                                        <button
                                            className={clsx("platform-enable-btn", isEnabled && "is-enabled")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                enablePlatform(activePostId, p.key);
                                            }}
                                            title={isEnabled ? "Copy current to platform" : t('enable_platform')}
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
                    <button className="placeholder-post-btn">
                        Post Story
                    </button>
                </div>
            </header>

            <div className="builder-workspace">
                {/* Left Side - Layout Selector (Expanded) */}
                <aside className="layout-sidebar">
                    {LAYOUTS.map(l => (
                        <button
                            key={l.key}
                            className={clsx("layout-btn", activePlatform.layout === l.key && "active")}
                            onClick={() => updateLayout(activePostId, activePost.activePlatform, l.key)}
                        >
                            <div className={clsx("layout-icon-preview", l.key)} />
                            <span className="layout-btn-label">{l.label}</span>
                        </button>
                    ))}
                </aside>

                {/* Center - Preview Canvas & Metadata Footer */}
                <div className="builder-main-view">
                    <div className="metadata-overlay-container">
                        <div className="metadata-chips-group">
                            <span className="meta-group-label">Presets</span>
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
                            <span className="meta-group-label">Hashtags</span>
                            <div className="chips-row">
                                {React.useMemo(() => {
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
                                }, [posts]).map(tag => (
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
                            <h3>Stories</h3>
                            <button className="sidebar-add-btn" onClick={() => addPost()}>
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

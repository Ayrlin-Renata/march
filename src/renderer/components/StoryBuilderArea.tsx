import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useTranslation } from 'react-i18next';
import { PLATFORMS, LAYOUTS } from '../types/stories';
import { MdAdd, MdDashboard, MdChevronRight, MdChevronLeft, MdContentCopy, MdCheck, MdDelete } from 'react-icons/md';
import clsx from 'clsx';
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
        copyToAll,
        updateSlotCrop
    } = useStoryStore();

    const [isPostListOpen, setIsPostListOpen] = React.useState(true);
    const [activeSlotRect, setActiveSlotRect] = React.useState<DOMRect | null>(null);
    const [activeEditingPostId, setActiveEditingPostId] = React.useState<string | null>(null);

    const activePost = posts.find(p => p.id === activePostId);

    if (!activePostId || !activePost) {
        return (
            <section className="story-builder-area empty">
                <div className="empty-state">
                    <MdDashboard size={48} className="empty-icon" />
                    <h3>{t('no_posts_title')}</h3>
                    <p>{t('create_your_first')}</p>
                    <button className="primary-btn" onClick={() => addPost()}>
                        <MdAdd size={18} />
                        {t('new_post')}
                    </button>
                </div>
            </section>
        );
    }

    const activePlatform = activePost.platforms[activePost.activePlatform];

    // Helper to find the active slot's crop data
    // We assume the user is interacting with one slot at a time? 
    // Actually, we'll need to know WHICH slot is being "overlapped".
    const [focusedSlotIndex, setFocusedSlotIndex] = React.useState<number | null>(null);
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
                        {PLATFORMS.map(p => {
                            const isEnabled = activePost.platforms[p.key].enabled;
                            const isActive = activePost.activePlatform === p.key;
                            return (
                                <div key={p.key} className="platform-tab-wrapper">
                                    <button
                                        className={clsx("platform-tab", isActive && "active", !isEnabled && "disabled")}
                                        onClick={() => isEnabled ? setActivePlatform(activePostId, p.key) : null}
                                    >
                                        <span className="platform-icon" style={{ backgroundColor: p.color }} />
                                        {p.name}
                                    </button>
                                    {!isEnabled && (
                                        <button
                                            className="platform-enable-btn"
                                            onClick={() => enablePlatform(activePostId, p.key)}
                                            title={t('enable_platform')}
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
                    <button
                        className="icon-btn"
                        title={t('copy_to_all')}
                        onClick={() => copyToAll(activePostId, activePost.activePlatform)}
                    >
                        <MdContentCopy size={16} />
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
                    <div className="area-body scrollable" onClick={(e) => {
                        if (e.target === e.currentTarget || (e.target as Element).classList.contains('preview-canvas')) {
                            setFocusedSlotIndex(null);
                        }
                    }}>
                        <PreviewCanvas
                            postId={activePostId}
                            platform={activePost.activePlatform}
                            onFocusSlot={(idx, rect) => {
                                setFocusedSlotIndex(idx);
                                setActiveSlotRect(rect);
                            }}
                            onDeselect={() => setFocusedSlotIndex(null)}
                        />
                    </div>

                    <footer className="metadata-bar">
                        {/* Hashtag Bar */}
                        <div className="hashtag-row">
                            <MdCheck size={16} className="meta-icon" />
                            <input
                                className="hashtag-input"
                                placeholder={t('hashtags_placeholder')}
                                value={activePlatform.text.split('\n\n')[1] || ''}
                                onChange={(e) => {
                                    const lines = activePlatform.text.split('\n\n');
                                    const mainText = lines[0] || '';
                                    useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${mainText}\n\n${e.target.value}`);
                                }}
                            />
                        </div>
                        <div className="presets-row">
                            {['#photography', '#daily', '#march', '#devlog'].map(tag => (
                                <button key={tag} className="preset-pill" onClick={() => {
                                    const currentText = activePost.platforms[activePost.activePlatform].text;
                                    if (!currentText.includes(tag)) {
                                        useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${tag}`);
                                    }
                                }}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </footer>
                </div>

                {/* Right Side - Post Manager */}
                <aside className={clsx("post-sidebar", !isPostListOpen && "collapsed")}>
                    <button className="collapse-btn" onClick={() => setIsPostListOpen(!isPostListOpen)}>
                        {isPostListOpen ? <MdChevronRight size={16} /> : <MdChevronLeft size={16} />}
                    </button>

                    <div className="post-sidebar-content">
                        <div className="sidebar-header">
                            <h3>{t('posts')}</h3>
                            <button className="icon-btn" onClick={() => addPost()}>
                                <MdAdd size={16} />
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

import React from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import { PLATFORMS, LAYOUTS } from '../../types/stories';
import { MdArrowBack, MdContentCopy, MdCheck, MdImage, MdCloudUpload, MdError, MdRefresh, MdChevronRight } from 'react-icons/md';
import { getThumbnailUrl } from '../../utils/pathUtils';
import clsx from 'clsx';

const Spinner: React.FC = () => (
    <div className="spinner-center-circle" />
);

const PostView: React.FC = () => {
    const { t } = useTranslation();
    const { posts, activePostId, setPostMode } = useStoryStore();
    const activePost = posts.find(p => p.id === activePostId);
    const platformPreferences = useSettingsStore(s => s.platformPreferences);
    const enabledPlatformKeys = useSettingsStore(s => s.enabledPlatformKeys);
    const scaleImagesToPlatforms = useSettingsStore(s => s.scaleImagesToPlatforms);

    // Track status per platform: 'idle' | 'posting' | 'success' | 'error'
    const [platformStatus, setPlatformStatus] = React.useState<Record<string, { status: 'idle' | 'posting' | 'success' | 'error', message?: string }>>({});
    const [hasBskyCreds, setHasBskyCreds] = React.useState(false);

    React.useEffect(() => {
        if (window.electron && window.electron.hasBskyCredentials) {
            window.electron.hasBskyCredentials().then(setHasBskyCreds);
        }
    }, []);

    const [copiedPlatform, setCopiedPlatform] = React.useState<string | null>(null);

    // Auto-Post Effect
    React.useEffect(() => {
        if (!activePost) return;

        enabledPlatformKeys.forEach(key => {
            const config = activePost.platforms[key];
            if (!config.enabled) return;

            // Only auto-post for Bluesky currently, and only if preferences enabled
            const autoPostEnabled = platformPreferences[key]?.autoPostEnabled;

            if (key === 'bsky' && autoPostEnabled && hasBskyCreds) {
                // Check if we already posted or are posting
                if (platformStatus[key]?.status === 'success' || platformStatus[key]?.status === 'posting') return;

                // Trigger post
                handlePostToBsky(config, key);
            }
        });
    }, [activePostId, hasBskyCreds, platformPreferences]); // Depend on relevant changes

    if (!activePost) return null;
    const enabledPlatforms = PLATFORMS.filter(p => activePost.platforms[p.key].enabled);

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPlatform(id);
        setTimeout(() => setCopiedPlatform(null), 2000);
    };

    const handleCopyImage = async (path: string, crop: any, id: string) => {
        if (window.electron && window.electron.copyImage) {
            const success = await window.electron.copyImage(path, crop?.pixelCrop);
            if (success) {
                setCopiedPlatform(id);
                setTimeout(() => setCopiedPlatform(null), 2000);
            }
        }
    };

    const handleNativeDrag = (e: React.MouseEvent, path: string, crop: any) => {
        e.preventDefault();
        if (window.electron) {
            if (crop?.pixelCrop) {
                window.electron.startDragCropped(path, crop.pixelCrop);
            } else {
                if (window.electron.startDrag) {
                    window.electron.startDrag(path, '');
                }
            }
        }
    };

    const handlePostToBsky = async (config: any, platformKey: string) => {
        if (!config) return;

        setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'posting' } }));

        try {
            const layoutDef = LAYOUTS.find(l => l.key === config.layout);
            const maxSlots = layoutDef ? layoutDef.slots : 4;
            const relevantSlots = config.slots.slice(0, maxSlots);
            const activeSlots = relevantSlots.filter((s: any) => s.imageId);

            // Construct new payload with crop data
            const images = activeSlots.map((s: any) => ({
                path: s.imagePath,
                crop: s.crop?.pixelCrop
            })).filter((i: any) => i.path);

            const result = await window.electron.postToBsky({
                text: config.text,
                images,
                scaleImages: scaleImagesToPlatforms
            });

            if (result.success) {
                setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'success' } }));
            } else {
                setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'error', message: result.error || 'Unknown error' } }));
            }
        } catch (e: any) {
            console.error(e);
            setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'error', message: e.message || 'Error posting' } }));
        }
    };

    return (
        <div className="post-view">
            <header className="post-view-header">
                <div className="header-left">
                    <h2>{t('post_story')}: {activePost.name}</h2>
                    <div className="platform-toggles" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {enabledPlatformKeys.map(key => {
                            const p = PLATFORMS.find(pl => pl.key === key);
                            if (!p) return null;
                            const isEnabled = activePost.platforms[key]?.enabled;

                            // Status indicator for chips if active
                            const status = platformStatus[key]?.status;

                            return (
                                <button
                                    key={key}
                                    style={{
                                        background: isEnabled ? p.color : 'rgba(255,255,255,0.05)',
                                        color: isEnabled ? '#fff' : 'var(--text-dim)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '4px 10px',
                                        borderRadius: 12,
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        opacity: isEnabled ? 1 : 0.6,
                                        cursor: 'default' // No toggle here
                                    }}
                                >
                                    {status === 'posting' && <div className="spinner-center-circle mini" />}
                                    {status === 'success' && <MdCheck size={12} />}
                                    {status === 'error' && <MdError size={12} />}
                                    {p.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button className="back-btn" onClick={() => setPostMode(false)}>
                        <MdArrowBack size={20} />
                        {t('back_to_editor')}
                    </button>
                </div>
            </header>

            <div className="post-view-content scrollable">
                {enabledPlatforms.map(p => {
                    const config = activePost.platforms[p.key];
                    const layoutDef = LAYOUTS.find(l => l.key === config.layout);
                    const idxs = Array.from({ length: layoutDef ? layoutDef.slots : 4 }, (_, i) => i);
                    // Filter slots that actually have images
                    const activeSlotIndices = idxs.filter(i => config.slots[i] && config.slots[i].imageId);

                    const isBsky = p.key === 'bsky';
                    const autoPostMode = platformPreferences[p.key]?.autoPostEnabled || false;
                    const status = platformStatus[p.key]?.status || 'idle';
                    const errorMsg = platformStatus[p.key]?.message;

                    return (
                        <div key={p.key} className="platform-post-section">
                            <div className="platform-section-header">
                                <div className="platform-badge" style={{ background: p.color }} />
                                <span className="platform-name">{t(p.key as any)}</span>

                                <div className="platform-status-area" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* Auto Post Status UI - Header Compact */}
                                    {autoPostMode && isBsky && (
                                        <>
                                            {status === 'idle' && hasBskyCreds && <span className="status-text muted">{t('auto_post_queued') || 'Queued...'}</span>}
                                            {status === 'posting' && (
                                                <div className="status-posting">
                                                    <Spinner />
                                                    <span>{t('posting') || 'Posting...'}</span>
                                                </div>
                                            )}
                                            {status === 'success' && (
                                                <div className="status-success">
                                                    <MdCheck size={18} />
                                                    <span>{t('posted_successfully') || 'Posted'}</span>
                                                </div>
                                            )}
                                            {status === 'error' && (
                                                <div className="status-error-badge">
                                                    <MdError size={16} />
                                                    <span>{t('failed')}</span>
                                                </div>
                                            )}
                                            {!hasBskyCreds && (
                                                <span className="error-text"><MdError /> {t('credentials_missing')}</span>
                                            )}
                                        </>
                                    )}

                                    {/* Manual Post Button (if not auto or fallback) */}
                                    {(!autoPostMode || (autoPostMode && !hasBskyCreds)) && isBsky && (
                                        <button
                                            className="action-btn primary post-now-btn"
                                            onClick={() => handlePostToBsky(config, p.key)}
                                            disabled={status === 'posting' || !hasBskyCreds}
                                        >
                                            {status === 'posting' ? t('posting') : (t('post_now') + ' ')} <MdCloudUpload />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Full Error Banner */}
                            {autoPostMode && isBsky && status === 'error' && (
                                <div className="platform-error-banner">
                                    <div className="error-message-content">
                                        <div className="error-main-line">
                                            <MdError size={22} className="error-icon" />
                                            <span className="error-title">{t('post_failed')}:</span>
                                            <span className="error-detail">{errorMsg}</span>
                                        </div>
                                    </div>
                                    <button className="retry-btn-large" onClick={() => handlePostToBsky(config, p.key)}>
                                        <MdRefresh size={18} />
                                        {t('retry_post')}
                                    </button>
                                </div>
                            )}

                            <details className="platform-content-details" open={!autoPostMode}>
                                <summary className="details-summary">
                                    <MdChevronRight className="chevron-icon" size={20} />
                                    <span className="summary-label">{t('post_content_checklist') || 'Content Checklist'}</span>
                                    <div className="summary-line" />
                                </summary>
                                <div className="post-sequence-list">
                                    {/* Text Block */}
                                    {config.text && (
                                        <div className="sequence-item text-item">
                                            <div className="item-content">
                                                <div className="post-text-preview">{config.text}</div>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className={clsx("action-btn tiny", copiedPlatform === `${p.key}-text` && "copy-success")}
                                                    onClick={() => handleCopyText(config.text, `${p.key}-text`)}
                                                    title={t('copy_caption_tooltip')}
                                                >
                                                    {copiedPlatform === `${p.key}-text` ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                                                    <span>{t('copy_text')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Images in order */}
                                    {activeSlotIndices.map((slotIdx) => {
                                        const slot = config.slots[slotIdx];
                                        // Use actual crop aspect if available, otherwise slot aspect
                                        const crop = slot.crop?.pixelCrop;
                                        const targetAspect = crop ? (crop.width / crop.height) : (layoutDef?.slotAspects[slotIdx] || 1);

                                        return (
                                            <div key={slotIdx} className="sequence-item image-item">
                                                <div className="item-content">
                                                    <div
                                                        className="post-image-preview-container"
                                                        style={{ aspectRatio: targetAspect }}
                                                    >
                                                        <div
                                                            className="post-image-preview-box"
                                                            onMouseDown={(e) => handleNativeDrag(e, slot.imagePath!, slot.crop)}
                                                            title={t('drag_to_post')}
                                                        >
                                                            <img src={getThumbnailUrl(slot.imagePath!, 400, slot.crop?.pixelCrop)} alt={`Slot ${slotIdx + 1}`} />
                                                            <div className="slot-index-badge">{slotIdx + 1}</div>
                                                            <div className="native-drag-hint">{t('drag_to_post')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className={clsx("action-btn tiny", copiedPlatform === `${p.key}-img-${slotIdx}` && "copy-success")}
                                                        onClick={() => handleCopyImage(slot.imagePath!, slot.crop, `${p.key}-img-${slotIdx}`)}
                                                        title={t('copy_image_tooltip')}
                                                    >
                                                        {copiedPlatform === `${p.key}-img-${slotIdx}` ? <MdCheck size={16} /> : <MdImage size={16} />}
                                                        <span>{t('copy_image')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PostView;

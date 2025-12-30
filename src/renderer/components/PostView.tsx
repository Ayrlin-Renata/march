import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { PLATFORMS, LAYOUTS } from '../types/stories';
import { MdArrowBack, MdContentCopy, MdCheck, MdImage } from 'react-icons/md';
import { getThumbnailUrl } from '../utils/pathUtils';
import clsx from 'clsx';

const PostView: React.FC = () => {
    const { posts, activePostId, setPostMode } = useStoryStore();
    const activePost = posts.find(p => p.id === activePostId);

    const [copiedPlatform, setCopiedPlatform] = React.useState<string | null>(null);

    if (!activePost) return null;

    const enabledPlatforms = PLATFORMS.filter(p => activePost.platforms[p.key].enabled);

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPlatform(id);
        setTimeout(() => setCopiedPlatform(null), 2000);
    };

    const handleCopyImage = async (path: string, crop: any, id: string) => {
        if (window.electron && window.electron.copyImage) {
            console.log(`[PostView/Copy] Path: ${path}`, crop?.pixelCrop);
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
                console.log('Dragging image with pixelCrop:', crop.pixelCrop);
                window.electron.startDragCropped(path, crop.pixelCrop);
            } else {
                console.warn('No pixelCrop found for drag, falling back to original.');
                if (window.electron.startDrag) {
                    window.electron.startDrag(path, '');
                }
            }
        }
    };

    return (
        <div className="post-view">
            <header className="post-view-header">
                <h2>Post Story: {activePost.name}</h2>
                <button className="back-btn" onClick={() => setPostMode(false)}>
                    <MdArrowBack size={20} />
                    Back to Editor
                </button>
            </header>

            <div className="post-view-content scrollable">
                {enabledPlatforms.map(p => {
                    const config = activePost.platforms[p.key];
                    const activeSlots = config.slots.filter(s => s.imageId);

                    return (
                        <div key={p.key} className="platform-post-section">
                            <div className="platform-section-header">
                                <div className="platform-badge" style={{ background: p.color }} />
                                <span className="platform-name">{p.name} Post Checkout</span>
                            </div>

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
                                                title="Copy Caption"
                                            >
                                                {copiedPlatform === `${p.key}-text` ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                                                <span>Copy Text</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Images in order */}
                                {activeSlots.map((slot, idx) => {
                                    const layoutInfo = LAYOUTS.find(l => l.key === config.layout);
                                    const targetAspect = layoutInfo?.slotAspects[idx] || 1;

                                    return (
                                        <div key={idx} className="sequence-item image-item">
                                            <div className="item-content">
                                                <div
                                                    className="post-image-preview-container"
                                                    style={{ aspectRatio: targetAspect }}
                                                >
                                                    <div
                                                        className="post-image-preview-box"
                                                        onMouseDown={(e) => handleNativeDrag(e, slot.imagePath!, slot.crop)}
                                                        title="Drag to post"
                                                    >
                                                        <img src={getThumbnailUrl(slot.imagePath!, 400, slot.crop?.pixelCrop)} alt={`Slot ${idx + 1}`} />
                                                        <div className="slot-index-badge">{idx + 1}</div>
                                                        <div className="native-drag-hint">DRAG TO POST</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className={clsx("action-btn tiny", copiedPlatform === `${p.key}-img-${idx}` && "copy-success")}
                                                    onClick={() => handleCopyImage(slot.imagePath!, slot.crop, `${p.key}-img-${idx}`)}
                                                    title="Copy Image to Clipboard"
                                                >
                                                    {copiedPlatform === `${p.key}-img-${idx}` ? <MdCheck size={16} /> : <MdImage size={16} />}
                                                    <span>Copy Image</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PostView;

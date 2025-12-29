import React from 'react';
import clsx from 'clsx';
import { type PlatformKey, LAYOUTS } from '../../types/stories';
import { useStoryStore } from '../../store/useStoryStore';
import { DroppableSlot } from './DroppableSlot';

const renderHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) =>
        part.startsWith('#') ? <span key={i} className="hashtag">{part}</span> : part
    );
};


// Updated preview with inline editing
export const PreviewCanvas: React.FC<{
    postId: string,
    platform: PlatformKey,
    focusedSlotIndex?: number | null,
    onFocusSlot: (index: number, rect: DOMRect) => void,
    onDeselect: () => void
}> = ({ postId, platform, focusedSlotIndex, onFocusSlot, onDeselect }) => {
    const post = useStoryStore(state => state.posts.find(p => p.id === postId));
    const config = post?.platforms[platform];
    const { updatePlatformText } = useStoryStore();

    if (!config) return null;

    return (
        <div
            className="preview-canvas"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onDeselect();
                }
            }}
        >
            <div className={clsx("mockup-container", platform)}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="mockup-header">
                    <div className="mockup-avatar" />
                    <div className="mockup-user-info">
                        <div className="mockup-name" />
                        <div className="mockup-handle" />
                    </div>
                </header>

                <div className="mockup-text-wrapper">
                    <textarea
                        className="mockup-text-area-inline"
                        value={config.text}
                        onChange={(e) => updatePlatformText(postId, platform, e.target.value)}
                        placeholder="Story text goes here..."
                        rows={1}
                        spellCheck={false}
                        style={{ color: 'transparent' }}
                        ref={(el) => {
                            if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                            }
                        }}
                    />
                    {/* Visual overlay for hashtags */}
                    <div className="mockup-text-highlight-overlay" aria-hidden="true">
                        {renderHashtags(config.text)}
                    </div>
                </div>

                <div className={clsx("mockup-image-grid", `layout-${config.layout}`)}>
                    {config.slots.slice(0, LAYOUTS.find(l => l.key === config.layout)?.slots || 1).map((slot, i) => (
                        <DroppableSlot
                            key={i}
                            postId={postId}
                            slotIndex={i}
                            platform={platform}
                            slotData={slot}
                            isFocused={focusedSlotIndex === i}
                            onFocus={(rect) => onFocusSlot(i, rect)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

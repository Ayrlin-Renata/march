import React from 'react';
import clsx from 'clsx';
import { type PlatformKey, LAYOUTS } from '../../types/stories';
import { useStoryStore } from '../../store/useStoryStore';
import { DroppableSlot } from './DroppableSlot';

// Updated preview with inline editing
export const PreviewCanvas: React.FC<{
    postId: string,
    platform: PlatformKey,
    onFocusSlot: (index: number, rect: DOMRect) => void,
    onDeselect: () => void
}> = ({ postId, platform, onFocusSlot, onDeselect }) => {
    const post = useStoryStore(state => state.posts.find(p => p.id === postId));
    const config = post?.platforms[platform];
    const { updatePlatformText } = useStoryStore();

    if (!config) return null;

    return (
        <div className="preview-canvas" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onDeselect();
            }
        }}>
            <div className={clsx("mockup-container", platform)} onClick={(e) => e.stopPropagation()}>
                <header className="mockup-header">
                    <div className="mockup-avatar" />
                    <div className="mockup-user-info">
                        <div className="mockup-name" />
                        <div className="mockup-handle" />
                    </div>
                </header>

                <textarea
                    className="mockup-text-area-inline"
                    value={config.text.split('\n\n')[0] || ''} // Display only the first part of the text
                    onChange={(e) => {
                        const lines = config.text.split('\n\n');
                        const hashtags = lines[1] || '';
                        updatePlatformText(postId, platform, `${e.target.value}\n\n${hashtags}`);
                    }}
                    placeholder="Story text goes here..."
                />

                <div className={clsx("mockup-image-grid", `layout-${config.layout}`)}>
                    {config.slots.slice(0, LAYOUTS.find(l => l.key === config.layout)?.slots || 1).map((slot, i) => (
                        <DroppableSlot
                            key={i}
                            postId={postId}
                            slotIndex={i}
                            platform={platform}
                            slotData={slot}
                            onFocus={(rect) => onFocusSlot(i, rect)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

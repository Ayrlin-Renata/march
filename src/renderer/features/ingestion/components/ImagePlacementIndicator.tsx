import React from 'react';
import { useStoryStore } from '../../../store/useStoryStore';
import { type PlatformKey } from '../../../types/stories';

export const ImagePlacementIndicator: React.FC<{ imageId: string }> = ({ imageId }) => {
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

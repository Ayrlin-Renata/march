import React from 'react';
import clsx from 'clsx';
import { useIngestionStore } from '../../../store/useIngestionStore';
import { getThumbnailUrl } from '../../../utils/pathUtils';

export const HoverOverlay: React.FC = () => {
    const images = useIngestionStore(s => s.images);
    const hoveredImageId = useIngestionStore(s => s.hoveredImageId);
    const popoverPos = useIngestionStore(s => s.hoveredPopoverPos);

    const img = React.useMemo(() =>
        hoveredImageId ? images.find(i => i.id === hoveredImageId) : null
        , [images, hoveredImageId]);

    if (!img || !popoverPos) return null;

    return (
        <div
            className={clsx(
                "hover-popover",
                popoverPos.below && "below",
                img.labelIndex && `label-${img.labelIndex}`
            )}
            style={{
                left: `clamp(min(250px, 50vw), ${popoverPos.left}px, max(100vw - 250px, 50vw))`,
                top: popoverPos.below ? popoverPos.top : 'auto',
                bottom: !popoverPos.below ? (window.innerHeight - popoverPos.top) : 'auto',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                pointerEvents: 'none',
                opacity: 1
            }}
        >
            <div className="label-glow" />
            <img src={getThumbnailUrl(img.path, 600)} alt="preview" />
            <div className="label-bar" />
            <div className="hover-popover-info">
                <span className="hover-image-name">{img.name}</span>
            </div>
        </div>
    );
};

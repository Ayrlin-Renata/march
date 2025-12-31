import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { useIngestionStore } from '../../../store/useIngestionStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { type IngestedImage } from '../../../types/images';
import { getThumbnailUrl } from '../../../utils/pathUtils';
import { thumbnailManager } from '../../../utils/thumbnailManager';
import { ImageThumbnail } from './ImageThumbnail';

export const BurstGroup: React.FC<{
    burst: IngestedImage[],
    cycleLabel: (id: string) => void,
    resetLabel: (id: string) => void
}> = React.memo(({ burst, cycleLabel, resetLabel }) => {
    const { t, i18n } = useTranslation();
    const selectedImageId = useIngestionStore(s => s.selectedImageId);
    const setSelectedImageId = useIngestionStore(s => s.setSelectedImageId);
    const watchedFolders = useSettingsStore(s => s.watchedFolders);

    const sourceAlias = React.useMemo(() => {
        const folder = watchedFolders.find(f => f.path === burst[0].source);
        if (folder) return folder.alias;

        const parts = burst[0].source.split(/[\\/]/);
        return parts[parts.length - 1] || burst[0].source;
    }, [watchedFolders, burst]);

    const groupRef = React.useRef<HTMLDivElement>(null);
    const [hasBeenVisible, setHasBeenVisible] = React.useState(false);

    React.useEffect(() => {
        if (!groupRef.current) return;
        const scrollContainer = groupRef.current.closest('.area-body');

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !hasBeenVisible) {
                setHasBeenVisible(true);
                burst.forEach(img => {
                    thumbnailManager.prefetch(getThumbnailUrl(img.path, 600), 100);
                });
            }
        }, {
            root: scrollContainer,
            rootMargin: '300% 0px'
        });

        observer.observe(groupRef.current);
        return () => observer.disconnect();
    }, [burst, hasBeenVisible]);

    return (
        <div ref={groupRef} className="burst-group">
            <div className="burst-header">
                <div className="burst-info-left">
                    <span className="burst-source">{sourceAlias}</span>
                    <span className="burst-date">
                        {(() => {
                            const date = new Date(burst[0].timestamp);
                            const now = new Date();
                            const isToday = date.toDateString() === now.toDateString();
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            const isYesterday = date.toDateString() === yesterday.toDateString();

                            if (isToday) return t('today');
                            if (isYesterday) return t('yesterday');
                            return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                        })()}
                    </span>
                </div>
                <span className="burst-time">
                    {new Date(burst[0].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div className="thumbnail-grid">
                <AnimatePresence>
                    {burst.map((img) => (
                        <ImageThumbnail
                            key={img.id}
                            img={img}
                            isSelected={selectedImageId === img.id}
                            onSelect={() => setSelectedImageId(img.id)}
                            onCycle={() => cycleLabel(img.id)}
                            onReset={() => resetLabel(img.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
});

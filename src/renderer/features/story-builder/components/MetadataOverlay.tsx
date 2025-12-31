import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStoryStore } from '../../../store/useStoryStore';

interface MetadataOverlayProps {
    activePostId: string;
    activePost: any;
    textPresets: any[];
    hashtags: string[];
}

export const MetadataOverlay: React.FC<MetadataOverlayProps> = ({
    activePostId,
    activePost,
    textPresets,
    hashtags
}) => {
    const { t } = useTranslation();

    return (
        <div className="metadata-overlay-container">
            <div className="metadata-chips-group">
                <span className="meta-group-label">{t('presets')}</span>
                <div className="chips-row">
                    {textPresets.map(preset => (
                        <button key={preset.id} className="preset-chip" onClick={() => {
                            const currentText = activePost.platforms[activePost.activePlatform].text;
                            if (!currentText.includes(preset.content)) {
                                useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${preset.content} `.trim());
                            }
                        }}>
                            {preset.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="metadata-chips-group">
                <span className="meta-group-label">{t('hashtags')}</span>
                <div className="chips-row">
                    {hashtags.map(tag => (
                        <button key={tag} className="hashtag-chip" onClick={() => {
                            const currentText = activePost.platforms[activePost.activePlatform].text;
                            if (!currentText.includes(tag)) {
                                useStoryStore.getState().updatePlatformText(activePostId, activePost.activePlatform, `${currentText} ${tag} `.trim());
                            }
                        }}>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

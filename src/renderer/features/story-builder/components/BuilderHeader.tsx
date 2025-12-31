import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import { PLATFORMS, type PlatformKey } from '../../../types/stories';
import { useStoryStore } from '../../../store/useStoryStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

interface BuilderHeaderProps {
    activePostId: string;
    activePost: any;
    setActivePlatform: (postId: string, platformKey: PlatformKey) => void;
    enablePlatform: (postId: string, platformKey: PlatformKey) => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
    activePostId,
    activePost,
    setActivePlatform,
    enablePlatform
}) => {
    const { t } = useTranslation();

    return (
        <header className="builder-header">
            <div className="builder-header-left">
                <h1>{t('story_builder')}</h1>
                <div className="platform-tabs" id="tutorial-platform-tabs">
                    {PLATFORMS.filter(p => useSettingsStore.getState().enabledPlatformKeys.includes(p.key)).map(p => {
                        const isEnabled = activePost.platforms[p.key].enabled;
                        const isActive = activePost.activePlatform === p.key;
                        return (
                            <div key={p.key} className="platform-tab-wrapper">
                                {!isActive && isEnabled && (
                                    <button
                                        className="platform-enable-btn close-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useStoryStore.getState().setPlatformEnabled(activePostId, p.key, false);
                                        }}
                                        title={t('disable_platform')}
                                    >
                                        <MdClose size={12} />
                                    </button>
                                )}
                                <button
                                    className={clsx("platform-tab", isActive && "active", !isEnabled && "disabled")}
                                    onClick={() => isActive ? null : (isEnabled ? setActivePlatform(activePostId, p.key) : enablePlatform(activePostId, p.key))}
                                >
                                    <span className="platform-icon" style={{ backgroundColor: p.color }} />
                                    {t(p.key as any)}
                                </button>
                                {!isActive && (
                                    <button
                                        className={clsx("platform-enable-btn", isEnabled && "is-enabled")}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            enablePlatform(activePostId, p.key);
                                        }}
                                        title={isEnabled ? t('copy_to_platform') : t('enable_platform')}
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
                <button className="placeholder-post-btn" id="tutorial-post-story-btn" onClick={() => {
                    useStoryStore.getState().finalizeCrops(activePostId);
                    useStoryStore.getState().setPostMode(true);
                }}>
                    {t('post_story')}
                </button>
            </div>
        </header>
    );
};

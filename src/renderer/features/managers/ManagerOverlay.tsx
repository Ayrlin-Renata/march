import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdClose, MdFolder, MdStyle, MdSettings, MdSmartphone,
    MdTranslate, MdWallpaper, MdAddToPhotos, MdLabel, MdInfo, MdImage
} from 'react-icons/md';
import clsx from 'clsx';

// Import Extracted Panes
import { FolderManagerPane } from './panes/FolderManager';
import { PresetManagerPane } from './panes/PresetManager';
import { IngestionSettingsPane } from './panes/IngestionSettings';
import { LightboxSettingsPane } from './panes/LightboxSettings';
import { SharingImagesManagerPane } from './panes/SharingImagesManager';
import { LanguageManagerPane } from './panes/LanguageManager';
import { GeneralManagerPane } from './panes/GeneralManager';
import { AboutManagerPane } from './panes/AboutManager';
import { PlatformManagerPane } from './panes/PlatformManager';
import { LabelManagerPane } from './panes/LabelManager';

export const ManagerOverlay: React.FC = () => {
    const { t } = useTranslation();
    const activeManager = useSettingsStore(s => s.activeManager);
    const setActiveManager = useSettingsStore(s => s.setActiveManager);

    return (
        <AnimatePresence>
            {activeManager && (
                <motion.div
                    key="manager-overlay"
                    className="manager-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveManager(null)}
                >
                    <motion.div
                        className="manager-window"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <aside className="manager-sidebar">
                            <div className="sidebar-section-title">{t('app_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'settings_language' && "active")} onClick={() => setActiveManager('settings_language')}>
                                <MdTranslate size={20} />
                                <span>{t('language_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_general' && "active")} onClick={() => setActiveManager('settings_general')}>
                                <MdSettings size={20} />
                                <span>{t('general_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_about' && "active")} onClick={() => setActiveManager('settings_about')}>
                                <MdInfo size={20} />
                                <span>{t('about')}</span>
                            </button>

                            <div className="sidebar-section-title">{t('ingestion_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'folders' && "active")} onClick={() => setActiveManager('folders')}>
                                <MdFolder size={20} />
                                <span>{t('folders')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_ingestion' && "active")} onClick={() => setActiveManager('settings_ingestion')}>
                                <MdAddToPhotos size={20} />
                                <span>{t('ingestion_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_lightbox' && "active")} onClick={() => setActiveManager('settings_lightbox')}>
                                <MdWallpaper size={20} />
                                <span>{t('lightbox_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'labels' && "active")} onClick={() => setActiveManager('labels')}>
                                <MdLabel size={20} />
                                <span>{t('labels')}</span>
                            </button>

                            <div className="sidebar-section-title">{t('story_builder_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'platforms' && "active")} onClick={() => setActiveManager('platforms')}>
                                <MdSmartphone size={20} />
                                <span>{t('platforms')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'presets' && "active")} onClick={() => setActiveManager('presets')}>
                                <MdStyle size={20} />
                                <span>{t('presets')}</span>
                            </button>

                            <div className="sidebar-section-title">{t('sharing_section') || 'Sharing'}</div>
                            <button className={clsx("sidebar-item", activeManager === 'sharing_images' && "active")} onClick={() => setActiveManager('sharing_images')}>
                                <MdImage size={20} />
                                <span>{t('images') || 'Images'}</span>
                            </button>

                            <div className="sidebar-spacer" />
                            <button className="sidebar-item close" onClick={() => setActiveManager(null)}>
                                <MdClose size={20} />
                                <span>{t('close')}</span>
                            </button>
                        </aside>
                        <main className="manager-main">
                            {activeManager === 'folders' && <FolderManagerPane />}
                            {activeManager === 'presets' && <PresetManagerPane />}
                            {activeManager === 'platforms' && <PlatformManagerPane />}
                            {activeManager === 'labels' && <LabelManagerPane />}
                            {activeManager === 'settings_ingestion' && <IngestionSettingsPane />}
                            {activeManager === 'settings_lightbox' && <LightboxSettingsPane />}
                            {activeManager === 'settings_language' && <LanguageManagerPane />}
                            {activeManager === 'settings_general' && <GeneralManagerPane />}
                            {activeManager === 'settings_about' && <AboutManagerPane />}
                            {activeManager === 'sharing_images' && <SharingImagesManagerPane />}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

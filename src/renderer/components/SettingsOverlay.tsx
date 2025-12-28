import React from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsOverlay: React.FC = () => {
    const {
        isSettingsOpen,
        toggleSettings,
        scrollSensitivity,
        setScrollSensitivity,
        ingestLookbackDays,
        setIngestLookbackDays
    } = useSettingsStore();
    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <motion.div
                    className="settings-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => toggleSettings(false)}
                >
                    <motion.div
                        className="settings-panel"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="settings-header">
                            <h3>{t('settings')}</h3>
                            <button className="icon-btn" onClick={() => toggleSettings(false)}>
                                <X size={20} />
                            </button>
                        </header>
                        <div className="settings-body">
                            <div className="settings-group">
                                <label className="settings-label">{t('scroll_sensitivity')}</label>
                                <div className="settings-control">
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="5"
                                        step="0.1"
                                        value={scrollSensitivity}
                                        onChange={(e) => setScrollSensitivity(parseFloat(e.target.value))}
                                    />
                                    <span>{scrollSensitivity.toFixed(1)}</span>
                                </div>
                            </div>

                            <div className="settings-group">
                                <label className="settings-label">{t('ingest_lookback')}</label>
                                <div className="settings-control">
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        step="1"
                                        value={ingestLookbackDays}
                                        onChange={(e) => setIngestLookbackDays(parseInt(e.target.value))}
                                    />
                                    <span>{ingestLookbackDays} {t('days')}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsOverlay;

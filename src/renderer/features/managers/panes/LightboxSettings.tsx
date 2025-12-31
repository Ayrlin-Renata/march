import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const LightboxSettingsPane: React.FC = () => {
    const { t } = useTranslation();
    const scrollSensitivity = useSettingsStore(s => s.scrollSensitivity);
    const setScrollSensitivity = useSettingsStore(s => s.setScrollSensitivity);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('lightbox_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('scroll_sensitivity')}</label>
                    <div className="settings-control">
                        <input type="range" min="0.1" max="5" step="0.1" value={scrollSensitivity} onChange={(e) => setScrollSensitivity(parseFloat(e.target.value))} />
                        <span>{scrollSensitivity.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

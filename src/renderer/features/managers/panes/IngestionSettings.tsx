import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const IngestionSettingsPane: React.FC = () => {
    const { t } = useTranslation();
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);
    const setIngestLookbackDays = useSettingsStore(s => s.setIngestLookbackDays);
    const thumbnailSize = useSettingsStore(s => s.thumbnailSize);
    const setThumbnailSize = useSettingsStore(s => s.setThumbnailSize);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('ingestion_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('ingest_lookback')}</label>
                    <div className="settings-control">
                        <input type="range" min="1" max="90" step="1" value={ingestLookbackDays} onChange={(e) => setIngestLookbackDays(parseInt(e.target.value))} />
                        <span>{ingestLookbackDays}<small>{t('days')}</small></span>
                    </div>
                </div>
                <div className="settings-group">
                    <label className="settings-label">{t('thumbnail_size')}</label>
                    <div className="settings-control">
                        <input type="range" min="80" max="300" step="10" value={thumbnailSize} onChange={(e) => setThumbnailSize(parseInt(e.target.value))} />
                        <span>{thumbnailSize}px</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

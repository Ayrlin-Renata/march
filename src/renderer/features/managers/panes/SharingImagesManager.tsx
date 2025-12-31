import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../store/useSettingsStore';
import Toggle from '../../../components/Common/Toggle';

export const SharingImagesManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const scaleImagesToPlatforms = useSettingsStore(s => s.scaleImagesToPlatforms);
    const setPlatformScaleImages = useSettingsStore(s => s.setPlatformScaleImages);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('sharing_images_settings') || 'Sharing: Images'}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('scale_images_to_platform') || 'Scale image resolution to platform constraints'}</label>
                    <Toggle enabled={scaleImagesToPlatforms} onChange={setPlatformScaleImages} />
                </div>
            </div>
        </div>
    );
};

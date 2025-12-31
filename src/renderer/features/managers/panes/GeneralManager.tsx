import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../../../hooks/useTutorial';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const GeneralManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const { startTutorial } = useTutorial();
    const setActiveManager = useSettingsStore(s => s.setActiveManager);
    const setHasSeenTutorialPrompt = useSettingsStore(s => s.setHasSeenTutorialPrompt);

    const handleReplayTutorial = () => {
        setActiveManager(null);
        setTimeout(() => {
            startTutorial();
        }, 300);
    };

    const handleResetPrompt = () => {
        setHasSeenTutorialPrompt(false);
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('general_settings')}</h4>
                <p>{t('general_desc')}</p>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('tutorial')}</label>
                    <div className="settings-control" style={{ gap: '8px' }}>
                        <button className="icon-btn-text" onClick={handleReplayTutorial}>
                            {t('replay_tutorial')}
                        </button>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <button className="icon-btn-text" onClick={handleResetPrompt}>
                            {t('reset_tutorial_prompt')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

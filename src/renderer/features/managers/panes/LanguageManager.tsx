import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const LanguageManagerPane: React.FC = () => {
    const { t, i18n } = useTranslation();
    const language = useSettingsStore(s => s.language);
    const setLanguage = useSettingsStore(s => s.setLanguage);

    const changeLanguage = (lang: string) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('language_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('select_language')}</label>
                    <div className="manager-list">
                        <button className={clsx("manager-item", language === 'en' && "active")} onClick={() => changeLanguage('en')}>
                            <span className="item-title">{t('english')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'zh' && "active")} onClick={() => changeLanguage('zh')}>
                            <span className="item-title">{t('chinese')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'id' && "active")} onClick={() => changeLanguage('id')}>
                            <span className="item-title">{t('indonesian')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'ja' && "active")} onClick={() => changeLanguage('ja')}>
                            <span className="item-title">{t('japanese')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'ko' && "active")} onClick={() => changeLanguage('ko')}>
                            <span className="item-title">{t('korean')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

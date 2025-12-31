import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../../../assets/logo.png';

export const AboutManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const [appVersion, setAppVersion] = React.useState('0.0.0');

    React.useEffect(() => {
        if (window.electron && window.electron.getAppVersion) {
            window.electron.getAppVersion().then(v => setAppVersion(v));
        }
    }, []);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('about_title')}</h4>
                <p>{t('about_desc')}</p>
            </header>
            <div className="settings-body about-pane">
                <div className="about-branding">
                    <img src={logo} alt="March Logo" className="about-logo" style={{ width: 64, height: 64, marginBottom: 16 }} />
                    <div className="about-info">
                        <h2 style={{ margin: 0 }}>March Photobox</h2>
                        <p className="version-tag" style={{ opacity: 0.6, margin: '4px 0 0 0' }}>v{appVersion}</p>
                    </div>
                </div>
                <div className="about-details" style={{ marginTop: 24 }}>
                    <p style={{ lineHeight: 1.5, opacity: 0.8 }}>{t('about_description_text')}</p>
                    <div className="about-links" style={{ marginTop: 24 }}>
                        <button className="icon-btn-text" style={{ padding: "1em 2em" }} onClick={() => window.electron.openExternal('https://github.com/Ayrlin-Renata/march')}>
                            GitHub Repository
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

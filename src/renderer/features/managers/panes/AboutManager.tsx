import React from 'react';
import { useTranslation } from 'react-i18next';
// Logos are in the public folder
const logoLight = './march_icon_color.png';
const logoDark = './march_icon_color_dark.png';
import { useTheme } from '../../../context/ThemeContext';
import { MdUpdate, MdSync, MdFileDownload, MdCheckCircle, MdError, MdRefresh, MdFavoriteBorder, MdEmail, MdOpenInNew } from 'react-icons/md';
import { FaGithub, FaBluesky, FaXTwitter } from 'react-icons/fa6';
import '../../../styles/features/about.css';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

export const AboutManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const [appVersion, setAppVersion] = React.useState('0.0.0');
    const [updateStatus, setUpdateStatus] = React.useState<UpdateStatus>('idle');
    const [updateProgress, setUpdateProgress] = React.useState(0);
    const [updateError, setUpdateError] = React.useState<string | null>(null);
    const [newVersion, setNewVersion] = React.useState<string | null>(null);
    const [hasCopied, setHasCopied] = React.useState(false);
    const [emailClicked, setEmailClicked] = React.useState(false);

    React.useEffect(() => {
        if (window.electron && window.electron.getAppVersion) {
            window.electron.getAppVersion().then(v => setAppVersion(v));
        }

        const cleanup = [
            window.electron.on('update-checking', () => {
                setUpdateStatus('checking');
                setUpdateError(null);
            }),
            window.electron.on('update-available', (info: any) => {
                setUpdateStatus('available');
                setNewVersion(info.version);
            }),
            window.electron.on('update-not-available', () => {
                setUpdateStatus('not-available');
            }),
            window.electron.on('update-error', (err: string) => {
                setUpdateStatus('error');
                setUpdateError(err);
            }),
            window.electron.on('update-download-progress', (progress: any) => {
                setUpdateStatus('downloading');
                setUpdateProgress(progress.percent);
            }),
            window.electron.on('update-downloaded', (info: any) => {
                setUpdateStatus('downloaded');
                setNewVersion(info.version);
                setUpdateProgress(100);
            })
        ];

        return () => {
            cleanup.forEach(fn => fn());
        };
    }, []);

    const handleCheckUpdate = () => {
        setUpdateStatus('checking');
        setUpdateError(null);
        window.electron.checkForUpdates();
    };

    const handleInstall = () => {
        window.electron.quitAndInstall();
    };

    const renderUpdateStatus = () => {
        switch (updateStatus) {
            case 'checking':
                return (
                    <div className="update-status-row">
                        <MdSync className="update-icon spinning" />
                        <div className="update-info">
                            <p className="update-status-text">{t('update_checking') || 'Checking for updates...'}</p>
                        </div>
                    </div>
                );
            case 'available':
                return (
                    <div className="update-status-row">
                        <MdUpdate className="update-icon" />
                        <div className="update-info">
                            <p className="update-status-text">{t('update_available') || 'Update available!'}</p>
                            {newVersion && <p className="update-version-text">Version {newVersion}</p>}
                        </div>
                    </div>
                );
            case 'downloading':
                return (
                    <div className="update-status-row" style={{ display: 'block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <MdFileDownload className="update-icon" />
                            <div className="update-info">
                                <p className="update-status-text">{t('update_downloading') || `Downloading update... ${Math.round(updateProgress)}%`}</p>
                            </div>
                        </div>
                        <div className="update-progress-container">
                            <div className="update-progress-bar" style={{ width: `${updateProgress}%` }} />
                        </div>
                    </div>
                );
            case 'downloaded':
                return (
                    <div className="update-status-row">
                        <MdCheckCircle className="update-icon success" />
                        <div className="update-info">
                            <p className="update-status-text">{t('update_ready') || 'Update ready to install'}</p>
                            <p className="update-version-text">Version {newVersion || 'latest'} downloaded</p>
                        </div>
                        <button className="icon-btn-text" onClick={handleInstall} style={{ padding: '8px 16px' }}>
                            {t('update_restart') || 'Restart & Install'}
                        </button>
                    </div>
                );
            case 'not-available':
                return (
                    <div className="update-status-row">
                        <MdCheckCircle className="update-icon success" />
                        <div className="update-info">
                            <p className="update-status-text">{t('update_uptodate') || 'March is up to date'}</p>
                        </div>
                        <button className="icon-btn-text" onClick={handleCheckUpdate} title="Check again">
                            <MdRefresh size={18} />
                        </button>
                    </div>
                );
            case 'error':
                return (
                    <div className="update-status-row" style={{ display: 'block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <MdError className="update-icon error" />
                            <div className="update-info">
                                <p className="update-status-text">{t('update_error') || 'Update failed'}</p>
                            </div>
                            <button className="icon-btn-text" onClick={handleCheckUpdate}>
                                {t('retry') || 'Retry'}
                            </button>
                        </div>
                        <div className="error-log-box">
                            <code>{updateError}</code>
                            <button
                                className="copy-error-btn"
                                onClick={() => {
                                    if (updateError) {
                                        navigator.clipboard.writeText(updateError);
                                        setHasCopied(true);
                                        setTimeout(() => setHasCopied(false), 2000);
                                    }
                                }}
                            >
                                {hasCopied ? t('copied') || 'Copied!' : t('copy') || 'Copy'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="update-status-row">
                        <MdUpdate className="update-icon" />
                        <div className="update-info">
                            <p className="update-status-text">{t('update_idle') || 'No updates checked yet'}</p>
                        </div>
                        <button className="icon-btn-text" onClick={handleCheckUpdate} style={{ padding: '8px 16px' }}>
                            {t('update_check') || 'Check for Updates'}
                        </button>
                    </div>
                );
        }
    };

    const { theme } = useTheme();
    const logo = theme === 'light' ? logoDark : logoLight;

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('about_title')}</h4>
                <p>{t('about_desc')}</p>
            </header>
            <div className="settings-body about-pane">
                <div className="about-branding">
                    <img src={logo} alt="March Logo" className="about-logo" style={{ width: 64, height: 64 }} />
                    <div className="about-info">
                        <h2 style={{ margin: 0 }}>March Photobox</h2>
                        <p className="version-tag" style={{ opacity: 0.6, margin: '4px 0 0 0' }}>v{appVersion}</p>
                    </div>
                </div>

                <div className="update-section">
                    {renderUpdateStatus()}
                </div>

                <div className="about-details">
                    <p style={{ lineHeight: 1.5, opacity: 0.8, fontSize: '0.85rem' }}>{t('about_description_text')}</p>
                    <div className="about-links" style={{ marginTop: 24 }}>
                        <button className="icon-btn-text" style={{ padding: "1em 0.5rem", width: '100%', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => window.electron.openExternal('https://ko-fi.com/ayrlin')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <MdFavoriteBorder style={{ height: '1.3rem', width: '1.3rem' }} /> {t('support_kofi')}
                            </div>
                            <MdOpenInNew size={16} opacity={0.4} />
                        </button>
                        <button className="icon-btn-text" style={{ padding: "1em 0.5rem", width: '100%', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => window.electron.openExternal('https://github.com/Ayrlin-Renata/march')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaGithub style={{ height: '1.3rem', width: '1.3rem' }} /> {t('github_repo')}
                            </div>
                            <MdOpenInNew size={16} opacity={0.4} />
                        </button>
                    </div>

                    <div className="about-broken-section" style={{ marginTop: 32, borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                        <h4 style={{ margin: '0 0 8px 0' }}>{t('about_broken_title')}</h4>
                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 16, lineHeight: 1.4 }}>{t('about_broken_desc')}</p>

                        <div className="broken-links-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button className="icon-btn-text" style={{ justifyContent: 'space-between', padding: '12px' }} onClick={() => window.electron.openExternal('https://github.com/Ayrlin-Renata/march/issues')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaGithub /> {t('github_issues')}
                                </div>
                                <MdOpenInNew size={14} opacity={0.4} />
                            </button>
                            <button
                                className="icon-btn-text"
                                style={{ justifyContent: 'space-between', padding: '12px' }}
                                onClick={async () => {
                                    const email = 'ayrlin.renata@gmail.com';
                                    if (!emailClicked) {
                                        await window.electron.openExternal(`mailto:${email}`);
                                        setEmailClicked(true);
                                    } else {
                                        navigator.clipboard.writeText(email);
                                        setHasCopied(true);
                                        setTimeout(() => setHasCopied(false), 2000);
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MdEmail /> {hasCopied ? t('copied') || 'Copied!' : (emailClicked ? t('copy_email') : t('contact_email'))}
                                </div>
                                <MdOpenInNew size={14} opacity={0.4} />
                            </button>
                            <button className="icon-btn-text" style={{ justifyContent: 'space-between', padding: '12px' }} onClick={() => window.electron.openExternal('https://bsky.app/profile/ayrl.in')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaBluesky /> {t('contact_bluesky')}
                                </div>
                                <MdOpenInNew size={14} opacity={0.4} />
                            </button>
                            <button className="icon-btn-text" style={{ justifyContent: 'space-between', padding: '12px' }} onClick={() => window.electron.openExternal('https://twitter.com/ayrlinrenata')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaXTwitter /> {t('contact_twitter')}
                                </div>
                                <MdOpenInNew size={14} opacity={0.4} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

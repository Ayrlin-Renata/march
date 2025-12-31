import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdError } from 'react-icons/md';
import clsx from 'clsx';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { PLATFORMS } from '../../../types/stories';
import Toggle from '../../../components/Common/Toggle';

export const PlatformManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const enabledPlatformKeys = useSettingsStore(s => s.enabledPlatformKeys);
    const setEnabledPlatformKeys = useSettingsStore(s => s.setEnabledPlatformKeys);
    const platformPreferences = useSettingsStore(s => s.platformPreferences);
    const setPlatformAutoPost = useSettingsStore(s => s.setPlatformAutoPost);

    // Bsky State
    const [bskyHandle, setBskyHandle] = React.useState('');
    const [bskyPassword, setBskyPassword] = React.useState('');
    const [hasBskyCreds, setHasBskyCreds] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (window.electron && window.electron.hasBskyCredentials) {
            window.electron.hasBskyCredentials().then(setHasBskyCreds);
        }
    }, []);

    const handleSaveBsky = async () => {
        if (!bskyHandle || !bskyPassword) return;
        setIsSaving(true);
        try {
            const success = await window.electron.saveBskyCredentials(bskyHandle, bskyPassword);
            if (success) {
                setHasBskyCreds(true);
                setBskyPassword(''); // Clear from memory
                setPlatformAutoPost('bsky', true);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('platforms')}</h4>
                <p>{t('platforms_desc')}</p>
            </header>
            <div className="manager-list scrollable">
                {PLATFORMS.map(p => {
                    const isEnabled = enabledPlatformKeys.includes(p.key);
                    return (
                        <div key={p.key} className={clsx("manager-item-platform", isEnabled && "expanded")}>
                            <div className="manager-item">
                                <div className="item-info">
                                    <span className="item-title">{t(p.key as any)}</span>
                                    <span className="item-subtitle" style={{ color: p.color }}>{p.key}</span>
                                </div>
                                <Toggle
                                    enabled={isEnabled}
                                    onChange={(enabled: boolean) => {
                                        if (enabled) setEnabledPlatformKeys([...enabledPlatformKeys, p.key]);
                                        else setEnabledPlatformKeys(enabledPlatformKeys.filter(k => k !== p.key));
                                    }}
                                />
                            </div>

                            {isEnabled && p.key === 'bsky' && (
                                <div className="platform-config">
                                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                        <label style={{ margin: 0 }}>{t('auto_post_mode')}</label>
                                        <Toggle
                                            enabled={platformPreferences['bsky']?.autoPostEnabled || false}
                                            onChange={(val) => setPlatformAutoPost('bsky', val)}
                                        />
                                    </div>
                                    <div className="config-status">
                                        {hasBskyCreds ? (
                                            <div className="status-badge success"><MdCheck size={14} /> {t('credentials_saved')}</div>
                                        ) : (
                                            <div className="status-badge warning"><MdError size={14} /> {t('credentials_missing')}</div>
                                        )}
                                    </div>
                                    <div className="input-group">
                                        <label>Handle</label>
                                        <input
                                            placeholder="example.bsky.social"
                                            value={bskyHandle}
                                            onChange={e => setBskyHandle(e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>App Password</label>
                                        <input
                                            type="password"
                                            placeholder="xxxx-xxxx-xxxx-xxxx"
                                            value={bskyPassword}
                                            onChange={e => setBskyPassword(e.target.value)}
                                        />
                                    </div>
                                    <button className="secondary-btn" onClick={handleSaveBsky} disabled={isSaving || !bskyHandle || !bskyPassword}>
                                        {isSaving ? 'Saving...' : 'Save Credentials'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

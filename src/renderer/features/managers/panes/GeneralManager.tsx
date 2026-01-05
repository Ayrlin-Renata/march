import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useTutorial } from '../../../hooks/useTutorial';
import { useSettingsStore } from '../../../store/useSettingsStore';
import Toggle from '../../../components/Common/Toggle';
import { MdKeyboard } from 'react-icons/md';

export const GeneralManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const { startTutorial } = useTutorial();
    const setActiveManager = useSettingsStore(s => s.setActiveManager);
    const setHasSeenTutorialPrompt = useSettingsStore(s => s.setHasSeenTutorialPrompt);
    const isCameraGridFeatureEnabled = useSettingsStore(s => s.isCameraGridFeatureEnabled);
    const setCameraGridFeatureEnabled = useSettingsStore(s => s.setCameraGridFeatureEnabled);
    const cameraGridHotkeys = useSettingsStore(s => s.cameraGridHotkeys);
    const setCameraGridHotkeys = useSettingsStore(s => s.setCameraGridHotkeys);
    const cameraGridOpacity = useSettingsStore(s => s.cameraGridOpacity);
    const setCameraGridOpacity = useSettingsStore(s => s.setCameraGridOpacity);
    const cameraGridColor = useSettingsStore(s => s.cameraGridColor);
    const setCameraGridColor = useSettingsStore(s => s.setCameraGridColor);
    const cameraGridLinesH = useSettingsStore(s => s.cameraGridLinesH);
    const setCameraGridLinesH = useSettingsStore(s => s.setCameraGridLinesH);
    const cameraGridLinesV = useSettingsStore(s => s.cameraGridLinesV);
    const setCameraGridLinesV = useSettingsStore(s => s.setCameraGridLinesV);

    const [localOpacity, setLocalOpacity] = React.useState(cameraGridOpacity);
    const [localColor, setLocalColor] = React.useState(cameraGridColor);
    const [localLinesH, setLocalLinesH] = React.useState(cameraGridLinesH);
    const [localLinesV, setLocalLinesV] = React.useState(cameraGridLinesV);

    // Sync local state if global store changes (e.g. hydration)
    React.useEffect(() => {
        setLocalOpacity(cameraGridOpacity);
    }, [cameraGridOpacity]);
    React.useEffect(() => {
        setLocalColor(cameraGridColor);
    }, [cameraGridColor]);
    React.useEffect(() => {
        setLocalLinesH(cameraGridLinesH);
    }, [cameraGridLinesH]);
    React.useEffect(() => {
        setLocalLinesV(cameraGridLinesV);
    }, [cameraGridLinesV]);

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

                <div className="experimental-section">
                    <header className="pane-header" style={{ marginBottom: '12px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {t('experimental_features')}
                            <span style={{ fontSize: '10px', background: 'var(--brand-primary)', color: 'white', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase' }}>Alpha</span>
                        </h4>
                    </header>

                    <div className="manager-list">
                        <div className={clsx("manager-item-platform", isCameraGridFeatureEnabled && "expanded")}>
                            <div className="manager-item">
                                <div className="item-info">
                                    <span className="item-title">{t('photo_grid_overlay')}</span>
                                    <span className="item-subtitle">{t('photo_grid_overlay_desc')}</span>
                                </div>
                                <Toggle
                                    enabled={isCameraGridFeatureEnabled}
                                    onChange={(val: boolean) => setCameraGridFeatureEnabled(val)}
                                />
                            </div>

                            {isCameraGridFeatureEnabled && (
                                <div className="platform-config">
                                    <div className="settings-notice" style={{ marginBottom: '12px', fontSize: '12px', opacity: 0.7, background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '4px' }}>
                                        {t('grid_update_notice') || "Note: You must toggle the grid off and on for changes to take effect."}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('hotkey_toggle')}</label>
                                        <HotkeyRecorder
                                            value={cameraGridHotkeys.toggle}
                                            onChange={(newVal) => setCameraGridHotkeys({ toggle: newVal })}
                                        />
                                    </div>
                                    <div className="settings-group" style={{ border: 'none', padding: 0 }}>
                                        <label className="settings-label">{t('grid_opacity')}</label>
                                        <div className="settings-control">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={localOpacity}
                                                onChange={(e) => setLocalOpacity(parseFloat(e.target.value))}
                                                onMouseUp={() => setCameraGridOpacity(localOpacity)}
                                                onTouchEnd={() => setCameraGridOpacity(localOpacity)}
                                            />
                                            <span>{Math.round(localOpacity * 100)}%</span>
                                        </div>
                                    </div>
                                    <div className="settings-group" style={{ border: 'none', padding: 0 }}>
                                        <label className="settings-label">{t('grid_color')}</label>
                                        <div className="settings-control">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="color"
                                                    className="label-color-input"
                                                    style={{ padding: 0, width: '28px', height: '28px' }}
                                                    value={localColor.slice(0, 7)}
                                                    onChange={(e) => setLocalColor(e.target.value + 'ff')}
                                                    onBlur={() => setCameraGridColor(localColor)}
                                                />
                                                <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', fontFamily: 'monospace' }}>{localColor.slice(0, 7)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="settings-group" style={{ border: 'none', padding: 0 }}>
                                        <label className="settings-label">{t('grid_lines_h')}</label>
                                        <div className="settings-control">
                                            <input
                                                type="range"
                                                min="0"
                                                max="15"
                                                step="1"
                                                value={localLinesH}
                                                onChange={(e) => setLocalLinesH(parseInt(e.target.value, 10))}
                                                onMouseUp={() => setCameraGridLinesH(localLinesH)}
                                                onTouchEnd={() => setCameraGridLinesH(localLinesH)}
                                            />
                                            <span>{localLinesH}</span>
                                        </div>
                                    </div>
                                    <div className="settings-group" style={{ border: 'none', padding: 0 }}>
                                        <label className="settings-label">{t('grid_lines_v')}</label>
                                        <div className="settings-control">
                                            <input
                                                type="range"
                                                min="0"
                                                max="15"
                                                step="1"
                                                value={localLinesV}
                                                onChange={(e) => setLocalLinesV(parseInt(e.target.value, 10))}
                                                onMouseUp={() => setCameraGridLinesV(localLinesV)}
                                                onTouchEnd={() => setCameraGridLinesV(localLinesV)}
                                            />
                                            <span>{localLinesV}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HotkeyRecorder: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = React.useState(false);
    // ...
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const formatKey = (e: KeyboardEvent): string | null => {
        const modifiers = [];
        if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Ignore if it's just a modifier being pressed
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;

        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toUpperCase();

        // Handle common non-printable keys
        const map: Record<string, string> = {
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right',
            'Escape': 'Esc'
        };
        key = map[key] || key;

        return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const combo = formatKey(e);
        if (combo) {
            onChange(combo);
            setIsRecording(false);
        }
    };

    React.useEffect(() => {
        if (isRecording) {
            window.addEventListener('keydown', handleKeyDown, true);
            return () => window.removeEventListener('keydown', handleKeyDown, true);
        }
    }, [isRecording]);

    return (
        <button
            ref={buttonRef}
            className={clsx("settings-input-btn", isRecording && "recording")}
            onClick={() => setIsRecording(!isRecording)}
            onBlur={() => setIsRecording(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                background: isRecording ? 'rgba(var(--brand-primary-rgb), 0.1)' : 'var(--bg-input)',
                border: `1px solid ${isRecording ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdKeyboard size={16} opacity={0.5} />
                <span>{isRecording ? t('press_keys') : (value || 'None')}</span>
            </div>
            {isRecording && <span className="recording-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-primary)', boxShadow: '0 0 8px var(--brand-primary)' }} />}
        </button>
    );
};

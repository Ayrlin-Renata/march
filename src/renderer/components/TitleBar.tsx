import React from 'react';
import { MdRemove, MdCropSquare, MdClose, MdGridOn, MdGridOff, MdMonitor, MdExpandMore } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
// Logos are in the public folder
const logoLight = './march_icon_color.png';
const logoDark = './march_icon_color_dark.png';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../context/ThemeContext';

export const TitleBar: React.FC = () => {
    const { t } = useTranslation();
    const { baseTheme } = useSettingsStore();
    const { theme } = useTheme();

    // Grid State
    const isGridFeatureEnabled = useSettingsStore(s => s.isCameraGridFeatureEnabled);
    const isGridActive = useSettingsStore(s => s.isCameraGridActive);
    const setGridActive = useSettingsStore(s => s.setCameraGridActive);
    const targetId = useSettingsStore(s => s.cameraGridTargetId);
    const setTargetId = useSettingsStore(s => s.setCameraGridTargetId);

    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [sources, setSources] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (isGridActive && window.electron?.toggleCameraGrid) {
            window.electron.toggleCameraGrid(true);
        }
        fetchSources(); // Fetch on mount to ensure names are synced

        // Sync state when hotkey is used in main process
        if (window.electron?.on) {
            window.electron.on('camera-grid-status', (status: boolean) => {
                setGridActive(status);
            });
        }
    }, []);

    const toggleGrid = () => {
        const newState = !isGridActive;
        setGridActive(newState);
        if (window.electron?.toggleCameraGrid) {
            window.electron.toggleCameraGrid(newState);
        }
    };

    const fetchSources = async () => {
        if (window.electron?.getDesktopSources) {
            const results = await window.electron.getDesktopSources();
            setSources(results);
        }
    };

    const handleTargetSelect = (id: string) => {
        setTargetId(id);
        if (window.electron?.updateCameraGridTarget) {
            window.electron.updateCameraGridTarget(id);
        }
        setIsDropdownOpen(false);
    };

    const currentTarget = sources.find(s => s.id === targetId) || { name: t('selectTarget') };

    React.useEffect(() => {
        const isWindows = window.navigator.userAgent.includes('Windows');
        if (!isWindows || !window.electron?.updateTitleBarOverlay) return;

        // Map theme colors for the native overlay - Using lighter colors to match gradient peaks
        let color = '#1a1a1b';
        let symbolColor = '#ffffff';

        if (baseTheme === 'march') {
            // March theme uses gradients ending in white (light) or deep pink (dark)
            color = theme === 'dark' ? '#3a2932ff' : '#fffafd';
            symbolColor = theme === 'dark' ? '#eceff1' : '#2c3e50';
        } else if (baseTheme === 'time') {
            // Time theme uses gradients ending in white (light) or deep midnight (dark)
            color = theme === 'dark' ? '#1e2a3cff' : '#e1f1ffff';
            symbolColor = theme === 'dark' ? '#ffe48a' : '#1e3a8a';
        } else if (baseTheme === 'simple') {
            // Simple theme uses flat tertiary/bg-card values
            color = theme === 'dark' ? '#1a1a1a' : '#f8f8f8';
            symbolColor = theme === 'dark' ? '#ffffff' : '#202124';
        }

        window.electron.updateTitleBarOverlay({
            color,
            symbolColor,
            height: 32 // Keep overlay 32px so the bottom border of the 33px title bar shows through
        });
    }, [baseTheme, theme]);

    const isWindows = window.navigator.userAgent.includes('Windows');

    return (
        <div className="app-title-bar">
            <div className="title-bar-drag-area">
                <div className="app-logo">
                    <img src={theme === 'light' ? logoDark : logoLight} alt="logo" className="logo-img" />
                    <span className="app-name">MARCH</span>
                </div>

                {isGridFeatureEnabled && (
                    <div className="title-bar-grid-controls">
                        <button
                            className={clsx("grid-toggle-btn", isGridActive && "active")}
                            onClick={toggleGrid}
                            title="Toggle Overlay Grid"
                        >
                            {isGridActive ? <MdGridOn size={16} /> : <MdGridOff size={16} />}
                        </button>

                        <div className="grid-target-select" onClick={() => {
                            if (!isDropdownOpen) fetchSources();
                            setIsDropdownOpen(!isDropdownOpen);
                        }}>
                            <MdMonitor size={14} />
                            <span className="target-name">{currentTarget.name}</span>
                            <MdExpandMore size={14} />

                            {isDropdownOpen && (
                                <div className="target-dropdown-menu">
                                    {sources.map(s => (
                                        <div
                                            key={s.id}
                                            className={clsx("target-option", s.id === targetId && "selected")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTargetSelect(s.id);
                                            }}
                                        >
                                            <div className="target-icon">
                                                <MdMonitor size={14} />
                                            </div>
                                            <span className="target-label">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {!isWindows && (
                <div className="title-bar-controls">
                    <button className="title-bar-btn minimize" onClick={() => window.electron.minimize()} title="Minimize">
                        <MdRemove size={18} />
                    </button>
                    <button className="title-bar-btn maximize" onClick={() => window.electron.maximize()} title="Maximize">
                        <MdCropSquare size={16} />
                    </button>
                    <button className="title-bar-btn close" onClick={() => window.electron.close()} title="Close">
                        <MdClose size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { MdRemove, MdCropSquare, MdClose } from 'react-icons/md';
import logoLight from '../../assets/march_icon_color.png';
import logoDark from '../../assets/march_icon_color_dark.png';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../context/ThemeContext';

export const TitleBar: React.FC = () => {
    const { baseTheme } = useSettingsStore();
    const { theme } = useTheme();

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

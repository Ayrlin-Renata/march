import React, { useEffect } from 'react';
import { useTheme } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, PenTool, Settings, SunMoon } from 'lucide-react';
import { useIngestionStore } from './store/useIngestionStore';
import IngestionArea from './components/IngestionArea';
import FullScreenPreview from './components/FullScreenPreview';
import SettingsOverlay from './components/SettingsOverlay';
import { useSettingsStore } from './store/useSettingsStore';
import './styles/App.css';


const App: React.FC = () => {
    const { toggleTheme } = useTheme();
    const { t } = useTranslation();
    const { addImages } = useIngestionStore();
    const { toggleSettings } = useSettingsStore();

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const cleanup = window.electron.on('file-added', (data: any) => {
                console.log('File ingested:', data.path, data.timestamp);
                addImages([{
                    path: data.path,
                    name: data.name,
                    timestamp: data.timestamp || Date.now(),
                    source: data.source || 'Default'
                }]);
            });
            return () => cleanup();
        }
    }, [t, addImages]);

    useEffect(() => {
        if (window.electron && window.electron.send) {
            window.electron.send('renderer-ready', {});
        }
    }, []);

    return (
        <div className="layout-root">
            {/* Sidebar Toolrail (VSCode-like) */}
            <nav className="toolrail">
                <div className="toolrail-top">
                    <button className="tool-btn active" title={t('ingestion')}>
                        <LayoutGrid size={24} />
                    </button>
                    <button className="tool-btn" title={t('story_builder')}>
                        <PenTool size={24} />
                    </button>
                </div>
                <div className="toolrail-bottom">
                    <button className="tool-btn" onClick={toggleTheme} title={t('theme_toggle')}>
                        <SunMoon size={24} />
                    </button>
                    <button className="tool-btn" onClick={() => toggleSettings()} title={t('settings')}>
                        <Settings size={24} />
                    </button>
                </div>
            </nav>

            <main className="main-content">
                <IngestionArea />

                {/* Story Builder Area */}
                <section className="story-builder-area">
                    <header className="area-header">
                        <h2>{t('story_builder')}</h2>
                    </header>
                    <div className="area-body">
                        <p className="placeholder-text">{t('placeholder_post')}</p>
                    </div>
                </section>
            </main>
            <FullScreenPreview />
            <SettingsOverlay />
        </div>
    );
};

export default App;

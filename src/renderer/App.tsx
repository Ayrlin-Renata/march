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
    const { toggleSettings, ingestionWidth, setIngestionWidth, thumbnailSize } = useSettingsStore();

    const isResizing = React.useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = e.clientX - 48; // Sidebar width
            if (newWidth > 200 && newWidth < 800) {
                setIngestionWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [setIngestionWidth]);

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const cleanup = window.electron.on('file-added', async (data: any) => {
                console.log('File ingested:', data.path, data.timestamp);

                // Fetch persistent label
                const labelIndex = await window.electron.getLabel(data.path);

                addImages([{
                    path: data.path,
                    name: data.name,
                    timestamp: data.timestamp || Date.now(),
                    source: data.source || 'Default',
                    labelIndex: labelIndex || 0
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
        <div className="layout-root" style={{ '--thumb-size': `${thumbnailSize}px` } as React.CSSProperties}>
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
                <div
                    className="ingestion-area-container"
                    style={{ width: `${ingestionWidth}px` }}
                >
                    <IngestionArea />
                </div>

                <div
                    className="resizer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        isResizing.current = true;
                        document.body.style.cursor = 'col-resize';
                    }}
                />

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

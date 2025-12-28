import React, { useEffect, useRef, useCallback } from 'react';
import { useTheme } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { MdSettings, MdMenu, MdSearch, MdDashboard, MdOutlineLightMode, MdOutlineDarkMode, MdStyle } from 'react-icons/md';
import { useIngestionStore } from './store/useIngestionStore';
import IngestionArea from './components/IngestionArea';
import StoryBuilderArea from './components/StoryBuilderArea';
import FullScreenPreview from './components/FullScreenPreview';
import SettingsOverlay from './components/SettingsOverlay';
import { useSettingsStore } from './store/useSettingsStore';
import { useStoryStore } from './store/useStoryStore';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';

// Styles
import './styles/base/variables.css';
import './styles/base/reset.css';
import './styles/layout/layout.css';
import './styles/components/buttons.css';
import './styles/features/ingestion.css';
import './styles/features/fullscreen-preview.css';
import './styles/features/settings.css';
import './styles/features/story-builder/layout.css';
import './styles/features/story-builder/canvas.css';
import './styles/features/story-builder/sidebar.css';
import './styles/features/story-builder/components.css';
import './styles/features/story-builder/crop-overlay.css';

interface ResizerProps {
    id: string;
    direction: 'horizontal' | 'vertical';
    onResize: (value: number) => void;
    className?: string;
}

const Resizer: React.FC<ResizerProps> = ({ id, direction, onResize, className }) => {
    const isResizing = useRef(false);
    const initialPos = useRef(0);
    const initialSize = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        initialPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        const parentElement = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
        if (parentElement) {
            initialSize.current = direction === 'horizontal' ? parentElement.offsetWidth : parentElement.offsetHeight;
        }
    }, [direction]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - initialPos.current;
        const newSize = initialSize.current + delta;

        if (direction === 'horizontal') {
            if (newSize > 200 && newSize < 800) {
                onResize(newSize);
            }
        } else {
            onResize(newSize);
        }
    }, [direction, onResize]);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = 'default';
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div
            id={id}
            className={`${className} resizer-${direction}`}
            onMouseDown={handleMouseDown}
        />
    );
};

const App: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const { } = useTranslation();
    const { addImages } = useIngestionStore();
    const { ingestionWidth, setIngestionWidth, thumbnailSize, toggleSettings } = useSettingsStore();

    const { activePostId, setSlotImage } = useStoryStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && activePostId) {
            const image = active.data.current as any;
            const slotData = over.data.current as any;
            const slotIndex = over.id as number;

            if (image && slotData && typeof slotIndex === 'number') {
                setSlotImage(activePostId, slotData.platform, slotIndex, {
                    id: image.id,
                    path: image.path,
                    width: image.width,
                    height: image.height
                });
            }
        }
    };

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const cleanup = window.electron.on('file-added', async (data: any) => {
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
    }, [addImages]);

    useEffect(() => {
        if (window.electron && window.electron.send) {
            window.electron.send('renderer-ready', {});
        }
    }, []);

    return (
        <div className="layout-root" style={{ '--thumb-size': `${thumbnailSize}px`, '--ingestion-width': `${ingestionWidth}px` } as React.CSSProperties}>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="main-layout-wrapper">
                    <main className="main-content">
                        <section className="ingestion-area-container" style={{ width: ingestionWidth }}>
                            <IngestionArea />
                        </section>

                        <Resizer
                            id="ingestion-resizer"
                            direction="horizontal"
                            onResize={setIngestionWidth}
                            className="layout-resizer"
                        />

                        <div className="content-grow">
                            <StoryBuilderArea />
                        </div>
                    </main>

                    <footer className="app-bottom-bar">
                        <div className="bottom-bar-left">
                            <button className="icon-btn" title="Listening Folders">
                                <MdMenu size={20} />
                            </button>
                            <button className="icon-btn" title="View">
                                <MdSearch size={20} />
                            </button>
                            <button className="icon-btn" title="Control">
                                <MdDashboard size={20} />
                            </button>
                        </div>

                        <div className="bottom-bar-center">
                            <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? <MdOutlineLightMode size={20} /> : <MdOutlineDarkMode size={20} />}
                            </button>
                        </div>

                        <div className="bottom-bar-right">
                            <div className="preset-tiny-manager">
                                <button className="icon-btn" title="Text Preset Manager">
                                    <MdStyle size={20} />
                                </button>
                            </div>
                            <button className="icon-btn" onClick={() => toggleSettings(true)}>
                                <MdSettings size={20} />
                            </button>
                        </div>
                    </footer>
                </div>
            </DndContext>
            <FullScreenPreview />
            <SettingsOverlay />
        </div>
    );
};

export default App;

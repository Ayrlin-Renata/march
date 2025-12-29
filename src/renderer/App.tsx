import React, { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { HoverOverlay as IngestionHoverOverlay, BurstControl as IngestionBurstControl } from './components/IngestionArea';
import { useTheme } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getThumbnailUrl } from './utils/pathUtils';
import { MdSettings, MdMenu, MdOutlineLightMode, MdOutlineDarkMode, MdStyle, MdSpeakerNotes } from 'react-icons/md';
import { useIngestionStore } from './store/useIngestionStore';
import IngestionArea from './components/IngestionArea';
import StoryBuilderArea from './components/StoryBuilderArea';
import FullScreenPreview from './components/FullScreenPreview';
import { ManagerOverlay } from './components/Managers/ManagerOverlay';
import { useSettingsStore } from './store/useSettingsStore';
import { useStoryStore } from './store/useStoryStore';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { MdViewSidebar } from 'react-icons/md';

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
import './styles/components/themes.css';

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
    const [ghostPos, setGhostPos] = React.useState<number | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        initialPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        const parentElement = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
        if (parentElement) {
            initialSize.current = direction === 'horizontal' ? parentElement.offsetWidth : parentElement.offsetHeight;
        }
        setGhostPos(direction === 'horizontal' ? e.clientX : e.clientY);
    }, [direction]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;

        // Validation logic for ghost pos
        if (direction === 'horizontal') {
            const delta = currentPos - initialPos.current;
            const newSize = initialSize.current + delta;
            const remainingWidth = window.innerWidth - newSize - 1; // -1 for resizer

            if (newSize > 150 && remainingWidth > 450) {
                setGhostPos(currentPos);
            }
        } else {
            setGhostPos(currentPos);
        }
    }, [direction]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        isResizing.current = false;
        document.body.style.cursor = 'default';
        setGhostPos(null);

        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - initialPos.current;
        const newSize = initialSize.current + delta;

        if (direction === 'horizontal') {
            const remainingWidth = window.innerWidth - newSize - 1;
            if (newSize > 150 && remainingWidth > 450) {
                onResize(newSize);
            }
        } else {
            onResize(newSize);
        }
    }, [direction, onResize]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <>
            <div
                id={id}
                className={`${className} resizer-${direction}`}
                onMouseDown={handleMouseDown}
            />
            {ghostPos !== null && (
                <div
                    className={clsx("resizer-ghost", `direction-${direction}`)}
                    style={{
                        [direction === 'horizontal' ? 'left' : 'top']: ghostPos
                    } as React.CSSProperties}
                />
            )}
        </>
    );
};

const App: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const { } = useTranslation();
    const addImages = useIngestionStore(s => s.addImages);
    const ingestionWidth = useSettingsStore(s => s.ingestionWidth);
    const setIngestionWidth = useSettingsStore(s => s.setIngestionWidth);
    const thumbnailSize = useSettingsStore(s => s.thumbnailSize);
    const setActiveManager = useSettingsStore(s => s.setActiveManager);
    const watchedFolders = useSettingsStore(s => s.watchedFolders);
    const labels = useSettingsStore(s => s.labels);
    const isBuilderCollapsed = useSettingsStore(s => s.isBuilderCollapsed);
    const setBuilderCollapsed = useSettingsStore(s => s.setBuilderCollapsed);
    const storedWindowWidthCollapsed = useSettingsStore(s => s.storedWindowWidthCollapsed);
    const storedWindowWidthUncollapsed = useSettingsStore(s => s.storedWindowWidthUncollapsed);
    const setStoredWindowWidthCollapsed = useSettingsStore(s => s.setStoredWindowWidthCollapsed);
    const setStoredWindowWidthUncollapsed = useSettingsStore(s => s.setStoredWindowWidthUncollapsed);
    const baseTheme = useSettingsStore(s => s.baseTheme);
    const setBaseTheme = useSettingsStore(s => s.setBaseTheme);

    const [isThemePopupOpen, setIsThemePopupOpen] = React.useState(false);

    const activePostId = useStoryStore(s => s.activePostId);
    const setSlotImage = useStoryStore(s => s.setSlotImage);

    const [activeDragItem, setActiveDragItem] = React.useState<any>(null);

    // Global drag reset failsafe
    React.useEffect(() => {
        const handleReset = () => {
            setActiveDragItem(null);
        };
        const handleDragStart = (e: DragEvent) => {
            // Prevent browser-default drag ghosting
            e.preventDefault();
        };

        window.addEventListener('blur', handleReset);
        window.addEventListener('mouseup', handleReset);
        window.addEventListener('dragstart', handleDragStart);

        return () => {
            window.removeEventListener('blur', handleReset);
            window.removeEventListener('mouseup', handleReset);
            window.removeEventListener('dragstart', handleDragStart);
        };
    }, []);

    // Sync Base Theme to DOM
    React.useEffect(() => {
        document.documentElement.setAttribute('data-base-theme', baseTheme);
    }, [baseTheme]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 15,
            },
        })
    );

    const handleDragStart = (event: any) => {
        setActiveDragItem(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItem(null);
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

    // Sync initial watched folders and lookback with backend
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);

    // Sync settings with backend
    useEffect(() => {
        if (window.electron && window.electron.send) {
            window.electron.send('set-settings', { ingestLookbackDays });
            window.electron.send('update-watched-folders', watchedFolders.map(f => f.path));
        }
    }, [ingestLookbackDays, watchedFolders]);

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const cleanup = window.electron.on('file-added', async (data: any) => {
                const labelIndex = await window.electron.getLabel(data.path);
                const burstThreshold = useSettingsStore.getState().burstThreshold;
                addImages([{
                    path: data.path,
                    name: data.name,
                    timestamp: data.timestamp || Date.now(),
                    source: data.source || 'Default',
                    labelIndex: labelIndex || 0
                }], burstThreshold);
            });
            return () => cleanup();
        }
    }, [addImages]);

    useEffect(() => {
        const handleWindowResize = () => {
            if (isBuilderCollapsed) {
                setStoredWindowWidthCollapsed(window.innerWidth);
            } else {
                setStoredWindowWidthUncollapsed(window.innerWidth);
            }
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [isBuilderCollapsed, setStoredWindowWidthCollapsed, setStoredWindowWidthUncollapsed]);

    const toggleBuilder = useCallback(() => {
        const newState = !isBuilderCollapsed;

        // Save current width BEFORE switching
        if (isBuilderCollapsed) {
            setStoredWindowWidthCollapsed(window.innerWidth);
        } else {
            setStoredWindowWidthUncollapsed(window.innerWidth);
        }

        if (window.electron && window.electron.setWindowWidth) {
            if (newState) {
                // Collapsing: Switch to the stored COLLAPSED width
                window.electron.setWindowWidth(storedWindowWidthCollapsed);
            } else {
                // Expanding: Switch to the stored UNCOLLAPSED width
                window.electron.setWindowWidth(storedWindowWidthUncollapsed);
            }
        }

        setBuilderCollapsed(newState);
    }, [isBuilderCollapsed, storedWindowWidthCollapsed, storedWindowWidthUncollapsed, setBuilderCollapsed, setStoredWindowWidthCollapsed, setStoredWindowWidthUncollapsed]);

    useEffect(() => {
        if (window.electron && window.electron.send) {
            window.electron.send('renderer-ready', {});

            // On startup, if collapsed, make sure the window is sized correctly
            if (window.electron && window.electron.setWindowWidth) {
                if (isBuilderCollapsed) {
                    window.electron.setWindowWidth(storedWindowWidthCollapsed);
                } else {
                    window.electron.setWindowWidth(storedWindowWidthUncollapsed);
                }
            }
        }
    }, []); // Only on mount

    const dynamicLabelStyles = React.useMemo(() => {
        return labels.map(l => `
            .label-${l.index} {
                --label-color: ${l.color};
            }
        `).join('\n');
    }, [labels]);

    return (
        <div className={clsx("layout-root", isBuilderCollapsed && "builder-collapsed")} style={{ '--thumb-size': `${thumbnailSize}px`, '--ingestion-width': `${ingestionWidth}px` } as React.CSSProperties}>
            <style>{dynamicLabelStyles}</style>
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="main-layout-wrapper">
                    <main className="main-content">
                        <section className="ingestion-area-container" style={{ width: isBuilderCollapsed ? '100%' : ingestionWidth }}>
                            <IngestionArea />
                        </section>

                        {!isBuilderCollapsed && (
                            <>
                                <Resizer
                                    id="ingestion-resizer"
                                    direction="horizontal"
                                    onResize={setIngestionWidth}
                                    className="layout-resizer"
                                />

                                <div className="content-grow">
                                    <StoryBuilderArea />
                                </div>
                            </>
                        )}
                    </main>

                    <footer className="app-bottom-bar">
                        <div className="bottom-bar-left">
                            <button className="icon-btn" title="Listening Folders" onClick={() => setActiveManager('folders')}>
                                <MdMenu size={20} />
                            </button>
                            <IngestionBurstControl />
                        </div>

                        <div className="bottom-bar-center">
                            <div className="theme-controls">
                                <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                    {theme === 'dark' ? <MdOutlineLightMode size={20} /> : <MdOutlineDarkMode size={20} />}
                                </button>
                                <div className="theme-picker-wrapper">
                                    <button
                                        className={clsx("icon-btn", isThemePopupOpen && "active")}
                                        onClick={() => setIsThemePopupOpen(!isThemePopupOpen)}
                                        title="Select Base Theme"
                                    >
                                        <MdStyle size={20} />
                                    </button>
                                    {isThemePopupOpen && (
                                        <div className="theme-selection-popup">
                                            <div
                                                className={clsx("theme-option", baseTheme === 'simple' && "selected")}
                                                onClick={() => { setBaseTheme('simple'); setIsThemePopupOpen(false); }}
                                            >
                                                <div className="palette simple">
                                                    <span style={{ background: '#ffffff' }}></span>
                                                    <span style={{ background: '#f8f9fa' }}></span>
                                                    <span style={{ background: '#1d9bf0' }}></span>
                                                </div>
                                                <span>Simple</span>
                                            </div>
                                            <div
                                                className={clsx("theme-option", baseTheme === 'march' && "selected")}
                                                onClick={() => { setBaseTheme('march'); setIsThemePopupOpen(false); }}
                                            >
                                                <div className="palette march">
                                                    <span style={{ background: '#ff85a2' }}></span>
                                                    <span style={{ background: '#fff5f8' }}></span>
                                                    <span style={{ background: '#a7d5f3ff' }}></span>
                                                </div>
                                                <span>March</span>
                                            </div>
                                            <div
                                                className={clsx("theme-option", baseTheme === 'time' && "selected")}
                                                onClick={() => { setBaseTheme('time'); setIsThemePopupOpen(false); }}
                                            >
                                                <div className="palette time">
                                                    <span style={{ background: '#0f172a' }}></span>
                                                    <span style={{ background: '#f0f9ff' }}></span>
                                                    <span style={{ background: '#d4af37' }}></span>
                                                </div>
                                                <span>Time</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bottom-bar-right">
                            <div className="preset-tiny-manager">
                                <button className="icon-btn" title="Text Preset Manager" onClick={() => setActiveManager('presets')}>
                                    <MdSpeakerNotes size={20} />
                                </button>
                            </div>
                            <button className={clsx("icon-btn", isBuilderCollapsed && "active")} title="Toggle Story Builder" onClick={toggleBuilder}>
                                <MdViewSidebar size={20} />
                            </button>
                            <button className="icon-btn" title="Settings" onClick={() => setActiveManager('settings_general')}>
                                <MdSettings size={20} />
                            </button>
                        </div>
                    </footer>
                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: '0.5',
                            },
                        },
                    }),
                }}>
                    {activeDragItem ? (
                        <div
                            className="thumbnail-wrapper dragging-overlay"
                            style={{
                                background: 'transparent',
                                width: thumbnailSize,
                                height: thumbnailSize
                            }}
                        >
                            <div className="thumbnail-inner">
                                <div className="thumbnail-card" style={{ background: 'transparent' }}>
                                    <img
                                        src={getThumbnailUrl(activeDragItem.path)}
                                        alt="dragging"
                                        className="thumbnail-img"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div className="label-glow" style={{ opacity: activeDragItem.labelIndex > 0 ? 0.4 : 0 }}></div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
            <FullScreenPreview />
            <ManagerOverlay />
            <IngestionHoverOverlay />
        </div>
    );
};

export default App;

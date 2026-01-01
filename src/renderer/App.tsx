import React, { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { HoverOverlay as IngestionHoverOverlay } from './features/ingestion/components/HoverOverlay';
import { BurstControl as IngestionBurstControl } from './features/ingestion/components/BurstControl';
import { useTheme } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getThumbnailUrl } from './utils/pathUtils';
import { MdSettings, MdOutlineLightMode, MdOutlineDarkMode, MdStyle, MdSpeakerNotes, MdFolderOpen, MdPhonelinkSetup, MdViewSidebar } from 'react-icons/md';
import { useIngestionStore } from './store/useIngestionStore';
import IngestionArea from './features/ingestion/IngestionArea';
import StoryBuilderArea from './features/story-builder/StoryBuilderArea';
import FullScreenPreview from './features/ingestion/components/FullScreenPreview';
import { ManagerOverlay } from './features/managers/ManagerOverlay';
import { useSettingsStore } from './store/useSettingsStore';
import { useStoryStore } from './store/useStoryStore';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import PostView from './features/post-view/PostView';
import { TutorialPrompt } from './components/Tutorial/TutorialPrompt';
import { Resizer } from './components/Shared/Resizer';
import { TitleBar } from './components/TitleBar';

// Styles
import './styles/base/variables.css';
import './styles/base/reset.css';
import './styles/layout/layout.css';
import './styles/components/buttons.css';
import './styles/features/ingestion.css';
import './styles/components/empty-state.css';
import './styles/features/fullscreen-preview.css';
import './styles/features/managers/layout.css';
import './styles/features/managers/components.css';
import './styles/features/managers/settings.css';
import './styles/features/managers/platforms.css';
import './styles/features/story-builder/layout.css';
import './styles/features/story-builder/canvas.css';
import './styles/components/tutorial.css';
import './styles/features/story-builder/sidebar.css';
import './styles/features/story-builder/components.css';
import './styles/features/story-builder/crop-overlay.css';
import './styles/features/post-view.css';
import './styles/components/themes.css';
import './styles/components/titlebar.css';

const App: React.FC = () => {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const addImages = useIngestionStore(s => s.addImages);
    const ingestionWidth = useSettingsStore(s => s.ingestionWidth);
    const setIngestionWidth = useSettingsStore(s => s.setIngestionWidth);
    const thumbnailSize = useSettingsStore(s => s.thumbnailSize);
    const setActiveManager = useSettingsStore(s => s.setActiveManager);
    const watchedFolders = useSettingsStore(s => s.watchedFolders);
    const textPresets = useSettingsStore(s => s.textPresets);
    const labels = useSettingsStore(s => s.labels);
    const hydrateSettings = useSettingsStore(s => s.hydrateSettings);
    const isBuilderCollapsed = useSettingsStore(s => s.isBuilderCollapsed);
    const setBuilderCollapsed = useSettingsStore(s => s.setBuilderCollapsed);
    const storedWindowWidthCollapsed = useSettingsStore(s => s.storedWindowWidthCollapsed);
    const storedWindowWidthUncollapsed = useSettingsStore(s => s.storedWindowWidthUncollapsed);
    const setStoredWindowWidthCollapsed = useSettingsStore(s => s.setStoredWindowWidthCollapsed);
    const setStoredWindowWidthUncollapsed = useSettingsStore(s => s.setStoredWindowWidthUncollapsed);
    const baseTheme = useSettingsStore(s => s.baseTheme);
    const setBaseTheme = useSettingsStore(s => s.setBaseTheme);
    const setIsDiscovering = useIngestionStore(s => s.setIsDiscovering);

    const [isThemePopupOpen, setIsThemePopupOpen] = React.useState(false);

    const { i18n } = useTranslation();
    const language = useSettingsStore(s => s.language);

    // Sync persisted language on mount
    React.useEffect(() => {
        if (language && i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, [language, i18n]);

    // Hydrate all settings from main process on mount
    React.useEffect(() => {
        hydrateSettings();
    }, [hydrateSettings]);

    const isPostMode = useStoryStore(s => s.isPostMode);
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
                distance: 3,
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
            window.electron.send('set-settings', {
                ingestLookbackDays,
                textPresets,
                labels,
                watchedFolders
            });
            // Also notify watcher about paths
            window.electron.send('update-watched-folders', watchedFolders);
        }
    }, [ingestLookbackDays, watchedFolders, textPresets, labels]);

    const fileBufferRef = useRef<any[]>([]);
    const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstBatchRef = useRef(true);

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const cleanup = window.electron.on('file-added', (data: any) => {
                // Add to buffer
                fileBufferRef.current.push({
                    path: data.path,
                    name: data.name,
                    timestamp: data.timestamp || Date.now(),
                    source: data.source || 'Default',
                    labelIndex: data.labelIndex || 0,
                    width: data.width,
                    height: data.height
                });

                const flush = () => {
                    if (fileBufferRef.current.length === 0) return;
                    const burstThreshold = useSettingsStore.getState().burstThreshold;
                    addImages([...fileBufferRef.current], burstThreshold);
                    fileBufferRef.current = [];
                    if (batchTimerRef.current) {
                        clearTimeout(batchTimerRef.current);
                        batchTimerRef.current = null;
                    }
                };

                // Fast-track the very first batch of the session to get pixels on screen immediately
                if (isFirstBatchRef.current) {
                    isFirstBatchRef.current = false;
                    flush();
                    return;
                }

                // Subsequent files are batched more conservatively to preserve UI responsiveness
                if (!batchTimerRef.current) {
                    // Constant 200ms batch window allows for smooth window dragging/interaction
                    batchTimerRef.current = setTimeout(flush, 200);
                }
            });
            return () => {
                cleanup();
                if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
            };
        }
    }, [addImages]);

    useEffect(() => {
        if (window.electron && window.electron.on) {
            const unsubStart = window.electron.on('discovery-started', () => setIsDiscovering(true));
            const unsubEnd = window.electron.on('discovery-finished', () => setIsDiscovering(false));
            return () => {
                unsubStart();
                unsubEnd();
            };
        }
    }, [setIsDiscovering]);

    useEffect(() => {
        const handleWindowResize = () => {
            // If we are in Post Mode, resizing the window should update the COLLAPSED width
            // because Post Mode uses the narrow view.
            if (isPostMode || isBuilderCollapsed) {
                setStoredWindowWidthCollapsed(window.innerWidth);
            } else {
                setStoredWindowWidthUncollapsed(window.innerWidth);
            }
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [isPostMode, isBuilderCollapsed, setStoredWindowWidthCollapsed, setStoredWindowWidthUncollapsed]);

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

    // Handle Post Mode window size transition
    useEffect(() => {
        if (!window.electron || !window.electron.setWindowWidth) return;

        if (isPostMode) {
            // Save current width if uncollapsed before shrinking
            if (!isBuilderCollapsed) {
                setStoredWindowWidthUncollapsed(window.innerWidth);
            }
            window.electron.setWindowWidth(storedWindowWidthCollapsed + 150);
        } else {
            // Restore appropriate width when exiting post mode
            if (isBuilderCollapsed) {
                window.electron.setWindowWidth(storedWindowWidthCollapsed);
            } else {
                window.electron.setWindowWidth(storedWindowWidthUncollapsed);
            }
        }
    }, [isPostMode]); // ONLY on mode change

    const dynamicLabelStyles = React.useMemo(() => {
        return labels.map(l => `
            .label-${l.index} {
                --label-color: ${l.color};
            }
        `).join('\n');
    }, [labels]);

    return (
        <div className={clsx("layout-root", isBuilderCollapsed && "builder-collapsed")} style={{ '--thumb-size': `${thumbnailSize}px`, '--ingestion-width': `${ingestionWidth}px` } as React.CSSProperties}>
            <TitleBar />
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
                            <button className="icon-btn" id="tutorial-folders-manager-btn" title={t('listening_folders_tooltip')} onClick={() => setActiveManager('folders')}>
                                <MdFolderOpen size={20} />
                            </button>
                            <IngestionBurstControl />
                        </div>

                        <div className="bottom-bar-center">
                            <div className="theme-controls" id="tutorial-theme-controls">
                                <button className="icon-btn theme-toggle" onClick={toggleTheme}>
                                    {theme === 'dark' && <MdOutlineDarkMode size={20} />}
                                    {theme === 'light' && <MdOutlineLightMode size={20} />}
                                </button>
                                <div className="theme-picker-wrapper">
                                    <button
                                        className={clsx("icon-btn", isThemePopupOpen && "active")}
                                        onClick={() => setIsThemePopupOpen(!isThemePopupOpen)}
                                        title={t('theme_select_tooltip')}
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
                                                <span>{t('theme_simple')}</span>
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
                                                <span>{t('theme_march')}</span>
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
                                                <span>{t('theme_time')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bottom-bar-right">
                            <button className="icon-btn btn-platforms" title={t('platforms')} onClick={() => setActiveManager('platforms')}>
                                <MdPhonelinkSetup size={20} />
                            </button>
                            <button id="tutorial-presets-manager-btn" className="icon-btn btn-presets" title={t('preset_manager_tooltip')} onClick={() => setActiveManager('presets')}>
                                <MdSpeakerNotes size={20} />
                            </button>
                            <button className="icon-btn" title={t('settings')} onClick={() => setActiveManager('settings_general')}>
                                <MdSettings size={20} />
                            </button>
                            <button className={clsx("icon-btn", !isBuilderCollapsed && "active")} title="Toggle Story Builder" onClick={toggleBuilder}>
                                <MdViewSidebar size={20} />
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
            {isPostMode && <PostView />}
            <TutorialPrompt />
        </div>
    );
};

export default App;

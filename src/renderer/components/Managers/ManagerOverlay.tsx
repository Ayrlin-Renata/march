import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngestionStore } from '../../store/useIngestionStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdFolder, MdStyle, MdSettings, MdAdd, MdDelete, MdSmartphone, MdTranslate, MdWallpaper, MdAddToPhotos, MdLabel } from 'react-icons/md';
import { PLATFORMS } from '../../types/stories';
import clsx from 'clsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MdDragHandle } from 'react-icons/md';
import Toggle from '../Common/Toggle';

const FolderManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const [newFolderPath, setNewFolderPath] = React.useState('');
    const [newFolderAlias, setNewFolderAlias] = React.useState('');

    const watchedFolders = useSettingsStore(s => s.watchedFolders);
    const addWatchedFolder = useSettingsStore(s => s.addWatchedFolder);
    const removeWatchedFolder = useSettingsStore(s => s.removeWatchedFolder);
    const removeImagesBySource = useIngestionStore(s => s.removeImagesBySource);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('watched_folders')}</h4>
                <p>{t('folders_desc')}</p>
            </header>
            <div className="manager-list scrollable">
                {watchedFolders.length === 0 && <p className="empty-msg">{t('no_folders')}</p>}
                {watchedFolders.map(f => (
                    <div key={f.path} className="manager-item">
                        <div className="item-info">
                            <span className="item-title">{f.alias}</span>
                            <span className="item-subtitle">{f.path}</span>
                        </div>
                        <button className="delete-btn" onClick={() => {
                            const parts = f.path.split(/[\\/]/).filter(Boolean);
                            const sourceName = parts[parts.length - 1] || 'Default';
                            removeWatchedFolder(f.path);
                            removeImagesBySource(sourceName);
                            if (window.electron && window.electron.updateWatchedFolders) {
                                const updated = watchedFolders.filter(wf => wf.path !== f.path);
                                window.electron.updateWatchedFolders(updated.map(wf => wf.path));
                            }
                        }}>
                            <MdDelete size={18} />
                        </button>
                    </div>
                ))}
            </div>
            <footer className="pane-footer">
                <div className="input-row">
                    <div className="path-input-wrapper">
                        <input placeholder={t('path_placeholder')} value={newFolderPath} onChange={e => setNewFolderPath(e.target.value)} />
                        <button className="browse-btn" title={t('browse')} onClick={async () => {
                            if (window.electron && window.electron.selectFolder) {
                                const folderPath = await window.electron.selectFolder();
                                if (folderPath) setNewFolderPath(folderPath);
                            }
                        }}>
                            <MdFolder size={18} />
                        </button>
                    </div>
                    <input placeholder={t('alias_placeholder')} value={newFolderAlias} onChange={e => setNewFolderAlias(e.target.value)} />
                    <button className="add-btn" onClick={() => {
                        if (newFolderPath) {
                            addWatchedFolder(newFolderPath, newFolderAlias || t('local_folder'));
                            setNewFolderPath('');
                            setNewFolderAlias('');
                            if (window.electron && window.electron.updateWatchedFolders) {
                                const updated = [...watchedFolders, { path: newFolderPath, alias: newFolderAlias || t('local_folder') }];
                                window.electron.updateWatchedFolders(updated.map(f => f.path));
                            }
                        }
                    }}>
                        <MdAdd size={20} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

const SortablePresetItem: React.FC<{ preset: any, updateTextPreset: any, removeTextPreset: any }> = ({ preset, updateTextPreset, removeTextPreset }) => {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: preset.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className={clsx("manager-item tall sortable-item", isDragging && "dragging")}>
            <div className="drag-handle" {...attributes} {...listeners}>
                <MdDragHandle size={20} />
            </div>
            <div className="item-info">
                <input
                    className="item-title-input"
                    value={preset.name}
                    onChange={(e) => updateTextPreset(preset.id, e.target.value, preset.content)}
                    placeholder={t('new_preset_name')}
                />
                <textarea
                    className="item-subtitle-input"
                    value={preset.content}
                    onChange={(e) => updateTextPreset(preset.id, preset.name, e.target.value)}
                    placeholder={t('content_placeholder')}
                    rows={1}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                    }}
                    ref={(el) => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                        }
                    }}
                />
            </div>
            <button className="delete-btn" onClick={() => removeTextPreset(preset.id)}>
                <MdDelete size={18} />
            </button>
        </div>
    );
};

const PresetManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const [newPresetName, setNewPresetName] = React.useState('');
    const [newPresetContent, setNewPresetContent] = React.useState('');
    const textPresets = useSettingsStore(s => s.textPresets);
    const addTextPreset = useSettingsStore(s => s.addTextPreset);
    const updateTextPreset = useSettingsStore(s => s.updateTextPreset);
    const removeTextPreset = useSettingsStore(s => s.removeTextPreset);
    const reorderTextPresets = useSettingsStore(s => s.reorderTextPresets);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEndPreset = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = textPresets.findIndex(p => p.id === active.id);
            const newIndex = textPresets.findIndex(p => p.id === over.id);
            reorderTextPresets(arrayMove(textPresets, oldIndex, newIndex));
        }
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('text_presets')}</h4>
                <p>{t('presets_desc')}</p>
            </header>
            <div className="manager-list scrollable">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndPreset}
                >
                    <SortableContext
                        items={textPresets.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {textPresets.map(p => (
                            <SortablePresetItem
                                key={p.id}
                                preset={p}
                                updateTextPreset={updateTextPreset}
                                removeTextPreset={removeTextPreset}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
            <footer className="pane-footer">
                <div className="input-col">
                    <input placeholder={t('new_preset_name')} value={newPresetName} onChange={e => setNewPresetName(e.target.value)} />
                    <textarea placeholder={t('content_placeholder')} value={newPresetContent} onChange={e => setNewPresetContent(e.target.value)} />
                    <button className="primary-btn" onClick={() => {
                        if (newPresetName && newPresetContent) {
                            addTextPreset(newPresetName, newPresetContent);
                            setNewPresetName('');
                            setNewPresetContent('');
                        }
                    }}>
                        <MdAdd size={18} /> {t('add_preset')}
                    </button>
                </div>
            </footer>
        </div>
    );
};

const IngestionSettingsPane: React.FC = () => {
    const { t } = useTranslation();
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);
    const setIngestLookbackDays = useSettingsStore(s => s.setIngestLookbackDays);
    const thumbnailSize = useSettingsStore(s => s.thumbnailSize);
    const setThumbnailSize = useSettingsStore(s => s.setThumbnailSize);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('ingestion_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('ingest_lookback')}</label>
                    <div className="settings-control">
                        <input type="range" min="1" max="30" step="1" value={ingestLookbackDays} onChange={(e) => setIngestLookbackDays(parseInt(e.target.value))} />
                        <span>{ingestLookbackDays}<small>{t('days')}</small></span>
                    </div>
                </div>
                <div className="settings-group">
                    <label className="settings-label">{t('thumbnail_size')}</label>
                    <div className="settings-control">
                        <input type="range" min="80" max="300" step="10" value={thumbnailSize} onChange={(e) => setThumbnailSize(parseInt(e.target.value))} />
                        <span>{thumbnailSize}px</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LightboxSettingsPane: React.FC = () => {
    const { t } = useTranslation();
    const scrollSensitivity = useSettingsStore(s => s.scrollSensitivity);
    const setScrollSensitivity = useSettingsStore(s => s.setScrollSensitivity);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('lightbox_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('scroll_sensitivity')}</label>
                    <div className="settings-control">
                        <input type="range" min="0.1" max="5" step="0.1" value={scrollSensitivity} onChange={(e) => setScrollSensitivity(parseFloat(e.target.value))} />
                        <span>{scrollSensitivity.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LanguageManagerPane: React.FC = () => {
    const { t, i18n } = useTranslation();
    const language = useSettingsStore(s => s.language);
    const setLanguage = useSettingsStore(s => s.setLanguage);

    const changeLanguage = (lang: string) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('language_settings')}</h4>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('select_language')}</label>
                    <div className="manager-list">
                        <button className={clsx("manager-item", language === 'en' && "active")} onClick={() => changeLanguage('en')}>
                            <span className="item-title">{t('english')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'zh' && "active")} onClick={() => changeLanguage('zh')}>
                            <span className="item-title">{t('chinese')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'id' && "active")} onClick={() => changeLanguage('id')}>
                            <span className="item-title">{t('indonesian')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'ja' && "active")} onClick={() => changeLanguage('ja')}>
                            <span className="item-title">{t('japanese')}</span>
                        </button>
                        <button className={clsx("manager-item", language === 'ko' && "active")} onClick={() => changeLanguage('ko')}>
                            <span className="item-title">{t('korean')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GeneralManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const ingestLookbackDays = useSettingsStore(s => s.ingestLookbackDays);
    const setIngestLookbackDays = useSettingsStore(s => s.setIngestLookbackDays);

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <h4>{t('general_settings')}</h4>
                <p>{t('general_desc')}</p>
            </header>
            <div className="settings-body">
                <div className="settings-group">
                    <label className="settings-label">{t('ingest_lookback')}</label>
                    <div className="settings-control">
                        <input type="range" min="1" max="90" step="1" value={ingestLookbackDays} onChange={(e) => setIngestLookbackDays(parseInt(e.target.value))} />
                        <span>{ingestLookbackDays}<small> {t('days')}</small></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlatformManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const enabledPlatformKeys = useSettingsStore(s => s.enabledPlatformKeys);
    const setEnabledPlatformKeys = useSettingsStore(s => s.setEnabledPlatformKeys);

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
                        <div key={p.key} className="manager-item">
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
                    );
                })}
            </div>
        </div>
    );
};

const SortableLabelItem: React.FC<{ label: any, images: any[], updateLabel: any, handleExport: any }> = ({ label, images, updateLabel, handleExport }) => {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: label.index.toString() });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className={clsx("manager-item tall sortable-item", isDragging && "dragging")}>
            <div className="drag-handle" {...attributes} {...listeners}>
                <MdDragHandle size={20} />
            </div>
            <div className="label-edit-row">
                <input type="color" className="label-color-input" value={label.color} onChange={(e) => updateLabel(label.index, label.name, e.target.value)} />
                <div className="item-info">
                    <input className="item-title-input" value={label.name} onChange={(e) => updateLabel(label.index, e.target.value, label.color)} />
                    <span className="item-subtitle">{t('label_prefix')} {label.index} • {t('images_count', { count: images.filter(img => img.labelIndex === label.index).length })}</span>
                </div>
            </div>
            <button className="primary-btn square" title={t('export_tooltip')} onClick={() => handleExport(label.index)}>
                <MdFolder size={18} />
            </button>
        </div>
    );
};

const LabelManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const labels = useSettingsStore(s => s.labels);
    const updateLabel = useSettingsStore(s => s.updateLabel);
    const reorderLabels = useSettingsStore(s => s.reorderLabels);
    const resetLabels = useSettingsStore(s => s.resetLabels);
    const images = useIngestionStore(s => s.images);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEndLabel = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = labels.findIndex(l => l.index.toString() === active.id);
            const newIndex = labels.findIndex(l => l.index.toString() === over.id);
            reorderLabels(arrayMove(labels, oldIndex, newIndex));
        }
    };

    const handleExport = async (labelIndex: number) => {
        if (!window.electron || !window.electron.selectFolder || !window.electron.exportImages) return;
        const targetDir = await window.electron.selectFolder();
        if (!targetDir) return;
        const labeledImages = images.filter(img => img.labelIndex === labelIndex);
        if (labeledImages.length === 0) {
            alert(t('no_labeled_images'));
            return;
        }
        const paths = labeledImages.map(img => img.path);
        const success = await window.electron.exportImages(paths, targetDir);
        if (success) alert(t('export_success', { count: paths.length, path: targetDir }));
        else alert(t('export_fail'));
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h4>{t('label_manager')}</h4>
                        <p>{t('labels_desc')}</p>
                    </div>
                    <button className="icon-btn-text" onClick={resetLabels} title={t('reset_defaults')}>
                        {t('reset_defaults')}
                    </button>
                </div>
            </header>
            <div className="manager-list scrollable">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndLabel}
                >
                    <SortableContext
                        items={labels.map(l => l.index.toString())}
                        strategy={verticalListSortingStrategy}
                    >
                        {labels.map(l => (
                            <SortableLabelItem
                                key={l.index}
                                label={l}
                                images={images}
                                updateLabel={updateLabel}
                                handleExport={handleExport}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export const ManagerOverlay: React.FC = () => {
    const { t } = useTranslation();
    const activeManager = useSettingsStore(s => s.activeManager);
    const setActiveManager = useSettingsStore(s => s.setActiveManager);

    return (
        <AnimatePresence>
            {activeManager && (
                <motion.div
                    key="manager-overlay"
                    className="manager-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveManager(null)}
                >
                    <motion.div
                        className="manager-window"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <aside className="manager-sidebar">
                            <div className="sidebar-section-title">{t('app_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'settings_language' && "active")} onClick={() => setActiveManager('settings_language')}>
                                <MdTranslate size={20} />
                                <span>{t('language_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_general' && "active")} onClick={() => setActiveManager('settings_general')}>
                                <MdSettings size={20} />
                                <span>{t('general_settings')}</span>
                            </button>

                            <div className="sidebar-section-title">{t('ingestion_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'folders' && "active")} onClick={() => setActiveManager('folders')}>
                                <MdFolder size={20} />
                                <span>{t('folders')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_ingestion' && "active")} onClick={() => setActiveManager('settings_ingestion')}>
                                <MdAddToPhotos size={20} />
                                <span>{t('ingestion_settings')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'settings_lightbox' && "active")} onClick={() => setActiveManager('settings_lightbox')}>
                                <MdWallpaper size={20} />
                                <span>{t('lightbox_settings')}</span>
                            </button>

                            <div className="sidebar-section-title">{t('story_builder_section')}</div>
                            <button className={clsx("sidebar-item", activeManager === 'labels' && "active")} onClick={() => setActiveManager('labels')}>
                                <MdLabel size={20} />
                                <span>{t('labels')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'platforms' && "active")} onClick={() => setActiveManager('platforms')}>
                                <MdSmartphone size={20} />
                                <span>{t('platforms')}</span>
                            </button>
                            <button className={clsx("sidebar-item", activeManager === 'presets' && "active")} onClick={() => setActiveManager('presets')}>
                                <MdStyle size={20} />
                                <span>{t('presets')}</span>
                            </button>

                            <div className="sidebar-spacer" />
                            <button className="sidebar-item close" onClick={() => setActiveManager(null)}>
                                <MdClose size={20} />
                                <span>{t('close')}</span>
                            </button>
                        </aside>
                        <main className="manager-main">
                            {activeManager === 'folders' && <FolderManagerPane />}
                            {activeManager === 'presets' && <PresetManagerPane />}
                            {activeManager === 'platforms' && <PlatformManagerPane />}
                            {activeManager === 'labels' && <LabelManagerPane />}
                            {activeManager === 'settings_ingestion' && <IngestionSettingsPane />}
                            {activeManager === 'settings_lightbox' && <LightboxSettingsPane />}
                            {activeManager === 'settings_language' && <LanguageManagerPane />}
                            {activeManager === 'settings_general' && <GeneralManagerPane />}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

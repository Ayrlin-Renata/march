import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDelete, MdDragHandle } from 'react-icons/md';
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
import clsx from 'clsx';
import { useSettingsStore } from '../../../store/useSettingsStore';

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

export const PresetManagerPane: React.FC = () => {
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

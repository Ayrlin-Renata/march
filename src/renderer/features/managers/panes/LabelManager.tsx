import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdFolder, MdDragHandle } from 'react-icons/md';
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
import { useIngestionStore } from '../../../store/useIngestionStore';

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
                <input
                    type="color"
                    className="label-color-input"
                    value={label.color.slice(0, 7)}
                    onChange={(e) => updateLabel(label.index, label.name, e.target.value + 'ff')}
                />
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

export const LabelManagerPane: React.FC = () => {
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

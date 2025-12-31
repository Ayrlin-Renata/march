import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdFolder, MdAdd, MdDelete } from 'react-icons/md';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useIngestionStore } from '../../../store/useIngestionStore';

export const FolderManagerPane: React.FC = () => {
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

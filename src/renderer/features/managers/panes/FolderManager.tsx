import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdFolder, MdAdd, MdDelete } from 'react-icons/md';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const FolderManagerPane: React.FC = () => {
    const { t } = useTranslation();
    const [newFolderPath, setNewFolderPath] = React.useState('');
    const [newFolderAlias, setNewFolderAlias] = React.useState('');

    const watchedFolders = useSettingsStore(s => s.watchedFolders);
    const setWatchedFolders = (folders: any[]) => useSettingsStore.setState({ watchedFolders: folders });

    const [localFolders, setLocalFolders] = React.useState([...watchedFolders]);
    const [isDirty, setIsDirty] = React.useState(false);
    const localFoldersRef = React.useRef(localFolders);

    React.useEffect(() => {
        localFoldersRef.current = localFolders;
    }, [localFolders]);

    // Commit on unmount
    React.useEffect(() => {
        return () => {
            if (isDirty) {
                console.log('[FolderManager] Committing deferred changes:', localFoldersRef.current);
                setWatchedFolders(localFoldersRef.current);
                if (window.electron && window.electron.updateWatchedFolders) {
                    window.electron.updateWatchedFolders(localFoldersRef.current.map(f => f.path));
                }
            }
        };
    }, [isDirty]); // Only re-run if isDirty changes, but we check ref on unmount

    const [editingPath, setEditingPath] = React.useState<string | null>(null);
    const [editingType, setEditingType] = React.useState<'alias' | 'path' | null>(null);
    const [editingValue, setEditingValue] = React.useState('');

    const startEditing = (path: string, type: 'alias' | 'path', value: string) => {
        setEditingPath(path);
        setEditingType(type);
        setEditingValue(value);
    };

    const handleSaveEdit = () => {
        if (!editingPath || !editingType || !editingValue.trim()) {
            setEditingPath(null);
            setEditingType(null);
            setEditingValue('');
            return;
        }

        setLocalFolders(prev => prev.map(f => f.path === editingPath ? { ...f, [editingType]: editingValue.trim() } : f));
        setIsDirty(true);

        setEditingPath(null);
        setEditingType(null);
        setEditingValue('');
    };

    return (
        <div className="manager-pane">
            <header className="pane-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <h4>{t('watched_folders')}</h4>
                    {isDirty && <span style={{ fontSize: '0.7rem', color: 'var(--fg-accent)', opacity: 0.8, fontWeight: 700 }}>{t('changes_pending')}</span>}
                </div>
                <p>{t('folders_desc')}</p>
            </header>
            <div className="manager-list scrollable">
                {localFolders.length === 0 && <p className="empty-msg">{t('no_folders')}</p>}
                {localFolders.map(f => (
                    <div key={f.path} className="manager-item">
                        <div className="item-info">
                            {editingPath === f.path && editingType === 'alias' ? (
                                <input
                                    autoFocus
                                    className="inline-edit-input title"
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') setEditingPath(null);
                                    }}
                                />
                            ) : (
                                <span
                                    className="item-title clickable"
                                    onClick={() => startEditing(f.path, 'alias', f.alias)}
                                    title="Click to edit alias"
                                >
                                    {f.alias}
                                </span>
                            )}

                            {editingPath === f.path && editingType === 'path' ? (
                                <input
                                    autoFocus
                                    className="inline-edit-input subtitle"
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') setEditingPath(null);
                                    }}
                                />
                            ) : (
                                <span
                                    className="item-subtitle clickable"
                                    onClick={() => startEditing(f.path, 'path', f.path)}
                                    title="Click to edit path"
                                >
                                    {f.path}
                                </span>
                            )}
                        </div>
                        <button className="delete-btn" onClick={() => {
                            setLocalFolders(prev => prev.filter(wf => wf.path !== f.path));
                            setIsDirty(true);
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
                            setLocalFolders(prev => [...prev, { path: newFolderPath, alias: newFolderAlias || t('local_folder'), enabled: true }]);
                            setIsDirty(true);
                            setNewFolderPath('');
                            setNewFolderAlias('');
                        }
                    }}>
                        <MdAdd size={20} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

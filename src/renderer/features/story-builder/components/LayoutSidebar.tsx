import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LAYOUTS, type PlatformKey, type LayoutKey } from '../../../types/stories';

interface LayoutSidebarProps {
    activePostId: string;
    activePost: any;
    activePlatform: any;
    updateLayout: (postId: string, platformKey: PlatformKey, layoutKey: LayoutKey) => void;
}

export const LayoutSidebar: React.FC<LayoutSidebarProps> = ({
    activePostId,
    activePost,
    activePlatform,
    updateLayout
}) => {
    const { t } = useTranslation();

    return (
        <aside className="layout-sidebar">
            {LAYOUTS.map(l => (
                <button
                    key={l.key}
                    className={clsx("layout-btn", activePlatform.layout === l.key && "active")}
                    onClick={() => updateLayout(activePostId, activePost.activePlatform, l.key)}
                >
                    <div className={clsx("layout-icon-preview", l.key)} />
                    <span className="layout-btn-label">{t(`layout_${l.key}` as any)}</span>
                </button>
            ))}
        </aside>
    );
};

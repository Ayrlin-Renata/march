import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import '../../styles/features/photo-grid-overlay.css';

const PhotoGridOverlay: React.FC = () => {
    const theme = useSettingsStore(s => s.theme);
    const color = useSettingsStore(s => s.cameraGridColor);
    const opacity = useSettingsStore(s => s.cameraGridOpacity);

    const linesH = useSettingsStore(s => s.cameraGridLinesH);
    const linesV = useSettingsStore(s => s.cameraGridLinesV);

    const lineStyle = {
        backgroundColor: color,
        opacity: opacity
    };

    const horizontalLines = Array.from({ length: linesH }).map((_, i) => {
        const top = ((i + 1) * 100) / (linesH + 1);
        return (
            <div
                key={`h-${i}`}
                className="grid-line horizontal"
                style={{ ...lineStyle, top: `${top}%` }}
            />
        );
    });

    const verticalLines = Array.from({ length: linesV }).map((_, i) => {
        const left = ((i + 1) * 100) / (linesV + 1);
        return (
            <div
                key={`v-${i}`}
                className="grid-line vertical"
                style={{ ...lineStyle, left: `${left}%` }}
            />
        );
    });

    return (
        <div className="photo-grid-overlay-container" data-theme={theme}>
            {horizontalLines}
            {verticalLines}
        </div>
    );
};

export default PhotoGridOverlay;

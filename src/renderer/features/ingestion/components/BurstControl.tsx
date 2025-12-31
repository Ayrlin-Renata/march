import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdBolt } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useIngestionStore } from '../../../store/useIngestionStore';

export const BurstControl: React.FC = () => {
    const { t } = useTranslation();
    const burstThreshold = useSettingsStore(s => s.burstThreshold);
    const setBurstThresholdSetting = useSettingsStore(s => s.setBurstThreshold);
    const reBurst = useIngestionStore(s => s.reBurst);
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const thresholdSec = (burstThreshold / 1000).toFixed(1);

    return (
        <div className="burst-control-wrapper" ref={containerRef}>
            <button
                className={clsx("icon-btn-text", isOpen && "active")}
                onClick={() => setIsOpen(!isOpen)}
                title={t('burst_sensitivity')}
            >
                <MdBolt size={18} />
                <span className="burst-label">{t('burst')}: </span>
                <span>{thresholdSec}s</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="burst-popup"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                        <div className="popup-header">
                            <span className="popup-title">{t('burst_sensitivity')}</span>
                            <span className="popup-value">{thresholdSec}s</span>
                        </div>
                        <input
                            type="range"
                            min="500"
                            max="60000"
                            step="500"
                            value={burstThreshold}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setBurstThresholdSetting(val);
                                reBurst(val);
                            }}
                            className="burst-slider"
                        />
                        <div className="popup-hint">{t('time_between_groups')}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

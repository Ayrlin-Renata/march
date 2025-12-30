import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTutorial } from '../hooks/useTutorial';
import { useTheme } from '../context/ThemeContext';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';

export const TutorialPrompt: React.FC = () => {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();
    const hasSeenTutorialPrompt = useSettingsStore(s => s.hasSeenTutorialPrompt);
    const setHasSeenTutorialPrompt = useSettingsStore(s => s.setHasSeenTutorialPrompt);
    const baseTheme = useSettingsStore(s => s.baseTheme);
    const setBaseTheme = useSettingsStore(s => s.setBaseTheme);
    const { startTutorial } = useTutorial();

    if (hasSeenTutorialPrompt) return null;

    const handleStart = () => {
        setHasSeenTutorialPrompt(true);
        startTutorial();
    };

    const handleSkip = () => {
        setHasSeenTutorialPrompt(true);
    };

    return (
        <AnimatePresence>
            <div className="manager-overlay">
                <motion.div
                    className="manager-window small tutorial-prompt"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    <div className="prompt-content" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-gradient-pink)' }}>
                        <h2 style={{ marginBottom: '8px', color: 'var(--fg-accent)' }}>{t('welcome_title')}</h2>
                        <p style={{ marginBottom: '24px', color: 'var(--text-dim)' }}>
                            {t('tutorial_prompt_desc')}
                        </p>

                        <div className="theme-selection-inline" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginBottom: '32px',
                            padding: '24px',
                            background: 'var(--bg-gradient)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.06rem', textAlign: 'left' }}>
                                    {t('theme_mode', 'Mode')}
                                </span>
                                <div style={{
                                    display: 'flex',
                                    background: 'var(--bg-tertiary)',
                                    padding: '4px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {(['light', 'dark'] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setTheme(m)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                borderRadius: '7px',
                                                border: 'none',
                                                background: theme === m ? 'var(--bg-secondary)' : 'transparent',
                                                color: theme === m ? 'var(--fg-primary)' : 'var(--text-dim)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: theme === m ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                            }}
                                        >
                                            {m === 'light' && <MdOutlineLightMode size={16} />}
                                            {m === 'dark' && <MdOutlineDarkMode size={16} />}
                                            <span style={{ fontSize: '0.75rem', fontWeight: theme === m ? 700 : 500 }}>
                                                {m.charAt(0).toUpperCase() + m.slice(1).replace('-', ' ')}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.06rem', textAlign: 'left' }}>
                                    {t('theme_base', 'Base Theme')}
                                </span>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    {(['simple', 'march', 'time'] as const).map((themeId) => {
                                        const palettes = {
                                            simple: theme === 'high-contrast' ? ['#000000', '#000000', '#ffff00'] : (theme === 'dark' ? ['#121212', '#1a1a1b', '#1d9bf0'] : ['#ffffff', '#f8f9fa', '#1d9bf0']),
                                            march: theme === 'high-contrast' ? ['#000000', '#000000', '#f06292'] : (theme === 'dark' ? ['#1a1f2c', '#2d1a24', '#f06292'] : ['#e3f2fd', '#fce4ec', '#f06292']),
                                            time: theme === 'high-contrast' ? ['#000000', '#000000', '#e7a325'] : (theme === 'dark' ? ['#0f172a', '#1e293b', '#ffc950'] : ['#f0f9ff', '#e0f2fe', '#e7a325'])
                                        };
                                        const colors = palettes[themeId];

                                        return (
                                            <div
                                                key={themeId}
                                                className={clsx("theme-option", baseTheme === themeId && "selected")}
                                                onClick={() => setBaseTheme(themeId)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px 8px',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: baseTheme === themeId ? 'var(--bg-surface-active)' : 'transparent',
                                                    border: '1px solid',
                                                    borderColor: baseTheme === themeId ? 'var(--fg-accent)' : 'var(--border-color)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    width: '12px',
                                                    height: '32px',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ flex: 1, background: colors[0] }} />
                                                    <div style={{ flex: 1, background: colors[1] }} />
                                                    <div style={{ flex: 1, background: colors[2] }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t(`theme_${themeId}`)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="primary-btn" onClick={handleStart}>
                                {t('tutorial_start')}
                            </button>
                            <button className="icon-btn-text" onClick={handleSkip}>
                                {t('tutorial_skip')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

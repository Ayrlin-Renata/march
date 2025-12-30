import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useTutorial = () => {
    const { t } = useTranslation();

    const startTutorial = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            popoverClass: 'driverjs-theme',
            steps: [
                {
                    element: '#tutorial-ingestion-area',
                    popover: {
                        title: t('tutorial_ingestion_title'),
                        description: t('tutorial_ingestion_desc'),
                        side: "right",
                        align: 'start'
                    }
                },
                {
                    element: '#tutorial-folders-manager-btn',
                    popover: {
                        title: t('tutorial_folders_title'),
                        description: t('tutorial_folders_desc'),
                        side: "top",
                        align: 'start'
                    }
                },
                {
                    element: '#tutorial-story-builder-area',
                    popover: {
                        title: t('tutorial_builder_title'),
                        description: t('tutorial_builder_desc'),
                        side: "left",
                        align: 'start'
                    }
                },
                {
                    element: '#tutorial-platform-tabs',
                    popover: {
                        title: t('tutorial_platforms_title'),
                        description: t('tutorial_platforms_desc'),
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '#tutorial-presets-manager-btn',
                    popover: {
                        title: t('tutorial_presets_title'),
                        description: t('tutorial_presets_desc'),
                        side: "top",
                        align: 'end'
                    }
                },
                {
                    element: '#tutorial-post-story-btn',
                    popover: {
                        title: t('tutorial_post_title'),
                        description: t('tutorial_post_desc'),
                        side: "bottom",
                        align: 'end'
                    }
                }
            ]
        });

        driverObj.drive();
    }, [t]);

    return { startTutorial };
};

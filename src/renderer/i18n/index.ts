import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "app_name": "March",
            "ingestion": "Ingestion",
            "story_builder": "Story Builder",
            "no_images": "No images ingested yet.",
            "placeholder_post": "Select a post or create a new one.",
            "settings": "Settings",
            "theme_toggle": "Toggle Theme",
            "file_ingested": "New file detected: {{filename}}",
            "scroll_sensitivity": "Scroll Sensitivity",
            "ingest_lookback": "Ingestion Look-back",
            "days": "Days",
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

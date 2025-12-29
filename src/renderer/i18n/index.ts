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
            "thumbnail_size": "Thumbnail Size",
            "new_post": "New Post",
            "posts": "Posts",
            "copy_to_all": "Copy to All",
            "active_post": "Active Post",
            "no_posts_title": "No Posts Yet",
            "create_your_first": "Create your first story to get started.",
            "post_name_placeholder": "Story Name...",
            "post_content_placeholder": "Write your post content here...",
            "enable_platform": "Enable Platform",
            "hashtags_placeholder": "Add hashtags...",
            "ingestion_settings": "Ingestion Settings",
            "lightbox_settings": "Lightbox Settings",
            "language_settings": "Language Settings",
            "general_settings": "General Settings",
            "app_section": "App",
            "ingestion_section": "Ingestion",
            "story_builder_section": "Story Builder",
            "select_language": "Select Language",
            "english": "English",
            "japanese": "Japanese",
            "korean": "Korean",
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

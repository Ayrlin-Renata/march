import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';
import zh from './locales/zh';
import id from './locales/id';

const resources = {
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
    zh: { translation: zh },
    id: { translation: id }
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

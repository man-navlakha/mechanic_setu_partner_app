import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import 'intl-pluralrules';
import { initReactI18next } from 'react-i18next';
import eh from './locales/eh.json';
import en from './locales/en.json';
import gu from './locales/gu.json';
import gue from './locales/gue.json';
import he from './locales/he.json';
import hi from './locales/hi.json';

const resources = {
    en: { translation: en },
    hi: { translation: hi },
    eh: { translation: eh },
    he: { translation: he },
    gu: { translation: gu },
    gue: { translation: gue },
};

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetector = {
    type: 'languageDetector' as const, // Ensure exact literal
    async: true,
    init: () => { },
    detect: async (callback: (lang: string) => void) => {
        try {
            // 1. Check AsyncStorage for saved language
            const savedLanguage = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
            if (savedLanguage) {
                return callback(savedLanguage);
            }

            // 2. Fallback to Device Language
            const deviceLang = getLocales()[0]?.languageCode ?? 'en';
            return callback(deviceLang);

        } catch (error) {
            console.log('Error reading language', error);
            callback('en');
        }
    },
    cacheUserLanguage: async (language: string) => {
        try {
            await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    },
};

i18n
    .use(languageDetector) // Use the custom detector
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v3',
        react: {
            useSuspense: false // React Native doesn't support Suspense well yet for this
        }
    });

export default i18n;

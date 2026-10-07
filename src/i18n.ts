import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { initialLanguage } from "./services/walletLanguageStorage";
import { SUPPORTED_LANGUAGES } from "./languages";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend) // 🔹 loads translations from JSON files
  .use(initReactI18next) // 🔹 connects i18next to React
  .init({
    fallbackLng: "en", // default language
    debug: import.meta.env.DEV, // only log in dev mode
    
    interpolation: {
      escapeValue: false, // react already escapes
    },

    // Legacy browser preference is provisional until the connected wallet is loaded.
    lng: initialLanguage(),
    supportedLngs: [...SUPPORTED_LANGUAGES],
    load: "currentOnly",

     backend: {
      // path to your translation files
      loadPath: "/frontend/locales/{{lng}}/translation.json",
    },
  });

export default i18n;
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend) // 🔹 loads translations from JSON files
  .use(LanguageDetector) // 🔹 detects language and remembers it in localStorage
  .use(initReactI18next) // 🔹 connects i18next to React
  .init({
    fallbackLng: "en", // default language
    debug: import.meta.env.DEV, // only log in dev mode
    
    interpolation: {
      escapeValue: false, // react already escapes
    },

    detection: {
      // you can customize where language is stored or read from
      order: ["localStorage", "cookie", "navigator"],
      caches: ["localStorage"], // 🔹 saves user choice
    },

     backend: {
      // path to your translation files
      loadPath: "/locales/{{lng}}/translation.json",
    },
  });

export default i18n;
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  fr: { common: frCommon },
};

// Detect initial language (only on client-side)
const getInitialLanguage = (): string => {
  // Check if we're in browser
  if (typeof window === "undefined") {
    return "en";
  }

  // Check localStorage first
  const stored = localStorage.getItem("language");
  if (stored && ["en", "es", "fr"].includes(stored)) {
    return stored;
  }

  // Check navigator.language
  const navLang = navigator.language.split("-")[0];
  if (["en", "es", "fr"].includes(navLang)) {
    return navLang;
  }

  return "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React already handles escaping
  },
  fallbackLng: "en",
  ns: ["common"],
});

export default i18n;

"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  DEFAULT_LANGUAGE,
  dictionary,
  LANGUAGE_COOKIE,
  type AppLanguage,
  type TranslationKey,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  translate: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: AppLanguage;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") {
      return initialLanguage;
    }

    const savedLanguage = window.localStorage.getItem(LANGUAGE_COOKIE);
    return savedLanguage === "en" || savedLanguage === "hi" ? savedLanguage : initialLanguage;
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(LANGUAGE_COOKIE, language);
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage: setLanguageState,
    translate: (key) => dictionary[language][key] ?? dictionary[DEFAULT_LANGUAGE][key],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}

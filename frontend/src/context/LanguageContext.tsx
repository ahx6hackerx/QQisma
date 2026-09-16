import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setCurrentLang, t as translate, Lang } from "../i18n";

interface LanguageContextValue {
  language: Lang;
  toggleLanguage: () => void;
  t: (arabicText: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLang(): Lang {
  const stored = localStorage.getItem("qisma_lang");
  return stored === "en" ? "en" : "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Lang>(getInitialLang);

  useEffect(() => {
    setCurrentLang(language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    localStorage.setItem("qisma_lang", language);
  }, [language]);

  function toggleLanguage() {
    setLanguage((prev) => (prev === "ar" ? "en" : "ar"));
  }

  // Re-create the t function each render so components re-render their
  // translated text the instant `language` (and therefore currentLang)
  // changes — it just delegates to the shared i18n module.
  function t(arabicText: string) {
    return translate(arabicText);
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir: language === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

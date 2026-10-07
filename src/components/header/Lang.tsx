import React, { useState, useEffect, useRef } from "react";
import "./lang.css";
import { useTranslation } from "react-i18next";
import { useWalletLanguage } from "../../hooks/useWalletLanguage";

import { LANGUAGES, normalizeLanguage } from "../../languages";

const Lang: React.FC = () => {
  const { i18n } = useTranslation();
  const selectLanguage = useWalletLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Determine current language (default to English)
  const currentLangCode = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";
  const currentLang =
    LANGUAGES.find((lang) => lang.code === currentLangCode) || LANGUAGES.find((l) => l.code === "en")!;
  const availableLanguages = LANGUAGES.filter((lang) => lang.code !== currentLang.code);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const changeLanguage = (lng: string) => {
    void selectLanguage(lng);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="lang-block" ref={ref}>
      <div className={`lang-select ${isOpen ? "open" : ""}`}>
        <button
          type="button"
          className="lang-btn"
          onClick={toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Language selector"
        >
          {currentLang.label}
        </button>

        {isOpen && (
          <ul className="lang-list" role="listbox">
            {availableLanguages.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  data-lang={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  aria-selected={lang.code === currentLang.code}
                >
                  {lang.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default React.memo(Lang);

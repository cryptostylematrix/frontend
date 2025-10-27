import React, { useState, useEffect, useRef } from "react";
import "./lang.css";
import { useTranslation } from "react-i18next";

interface LangOption {
  code: string;
  label: string;
}

const LANGUAGES: LangOption[] = [
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Український" },
  { code: "pl", label: "Polski" },
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "kk", label: "Қазақша" },
  { code: "hu", label: "Magyar" },
];

const Lang: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Determine current language (default to English)
  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES.find((l) => l.code === "en")!;

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
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
            {LANGUAGES.map((lang) => (
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

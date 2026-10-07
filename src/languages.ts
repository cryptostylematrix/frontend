export const LANGUAGES: { code: string; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hu", label: "Magyar" },
  { code: "it", label: "Italiano" },
  { code: "kk", label: "Қазақша" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Український" },
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map(language => language.code);

// Storage and API validation must accept future catalog entries without dropping subtags.
export function normalizeLanguageTag(value: string | null | undefined): string | null {
  const language = value?.trim().toLowerCase();
  return language && language.length <= 63 && /^[a-z]{2,8}(-[a-z0-9]{1,8})*$/.test(language)
    ? language : null;
}

export function normalizeLanguage(value: string | null | undefined): string | null {
  const language = normalizeLanguageTag(value?.replace(/_/g, "-"));
  if (!language) return null;
  const parts = language.split("-");
  while (parts.length) {
    const match = SUPPORTED_LANGUAGES.find(code => code.toLowerCase() === parts.join("-"));
    if (match) return match;
    parts.pop();
  }
  return null;
}

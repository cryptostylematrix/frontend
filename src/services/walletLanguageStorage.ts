import { normalizeLanguage, normalizeLanguageTag } from "../languages";

export function readLegacyLanguage(): string | null {
  // Preserve the old detector's precedence: localStorage, then cookie.
  try {
    const local = normalizeLanguage(localStorage.getItem("i18nextLng"));
    if (local) return local;
  } catch { /* Storage may be disabled by browser policy. */ }
  const cookie = document.cookie.split(";").map(value => value.trim())
    .find(value => value.startsWith("i18next="));
  try { return cookie ? normalizeLanguage(decodeURIComponent(cookie.slice(8))) : null; }
  catch { return null; }
}

export function initialLanguage(): string {
  return readLegacyLanguage() ?? navigator.languages.map(normalizeLanguage).find(Boolean)
    ?? normalizeLanguage(navigator.language) ?? "en";
}

export function clearLegacyLanguage(): void {
  try { localStorage.removeItem("i18nextLng"); } catch { /* Retry on a later successful sync. */ }
  // Cover the old root cookie and path-scoped cookies under the frontend base path.
  const parts = window.location.pathname.split("/");
  const paths = new Set(["/", "/frontend", "/frontend/"]);
  for (let index = 1; index < parts.length; index++) {
    paths.add(parts.slice(0, index + 1).join("/") || "/");
  }
  for (const path of paths) {
    document.cookie = `i18next=; Max-Age=0; path=${path}; SameSite=Lax`;
  }
}

export function saveGuestLanguage(language: string): void {
  try { localStorage.setItem("i18nextLng", language); } catch { /* Guest selection remains in memory. */ }
}

const pendingKey = (wallet: string) => `cs.walletLanguage.pending.${wallet}`;
export function readPendingLanguage(wallet: string): string | null {
  try { return normalizeLanguageTag(localStorage.getItem(pendingKey(wallet))); } catch { return null; }
}
export function savePendingLanguage(wallet: string, language: string): void {
  try { localStorage.setItem(pendingKey(wallet), language); } catch { /* In-memory retry remains available. */ }
}
export function clearPendingLanguage(wallet: string, language: string): void {
  try {
    if (localStorage.getItem(pendingKey(wallet)) === language) localStorage.removeItem(pendingKey(wallet));
  } catch { /* A later connection may safely repeat the save. */ }
}

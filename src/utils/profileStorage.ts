import { ErrorCode } from "../errors/ErrorCodes";

/**
 * Represents a wallet profile loaded from the UI profiles API.
 */
export interface Profile {
  address: string;
  wallet: string;
  login: string;
  valid: boolean;
  mode: "owner" | "preview";
  owned: boolean;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
}

export type LegacyProfileIntent = {
  login: string;
  mode: "owner" | "preview";
};

export type LegacyProfileStorage = {
  exists: boolean;
  profiles: LegacyProfileIntent[];
};

const LEGACY_PROFILES_KEY = (wallet: string) => `profiles_${wallet}`;

export const getLegacyProfileStorage = (
  wallet: string,
): LegacyProfileStorage => {
  if (!wallet) return { exists: false, profiles: [] };

  try {
    const value = localStorage.getItem(LEGACY_PROFILES_KEY(wallet));
    if (value === null) return { exists: false, profiles: [] };

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return { exists: true, profiles: [] };

    const profiles = Array.from(
      new Map(
        parsed
          .filter(
            (profile): profile is { login: string; mode?: unknown } =>
              typeof profile === "object" &&
              profile !== null &&
              "login" in profile &&
              typeof profile.login === "string" &&
              profile.login.trim().length > 0,
          )
          .map((profile) => {
            const intent: LegacyProfileIntent = {
              login: profile.login.trim().toLowerCase(),
              mode: profile.mode === "preview" ? "preview" : "owner",
            };
            return [intent.login, intent] as const;
          }),
      ).values(),
    );

    return { exists: true, profiles };
  } catch (error) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_READ_FAILED}:`, error);
    return { exists: true, profiles: [] };
  }
};

export const saveLegacyProfileStorage = (
  wallet: string,
  profiles: LegacyProfileIntent[],
): void => {
  if (!wallet) return;

  try {
    const key = LEGACY_PROFILES_KEY(wallet);
    if (profiles.length > 0) {
      localStorage.setItem(key, JSON.stringify(profiles));
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_WRITE_FAILED}:`, error);
  }
};

/* ============================================================
   Current Profile Management
   ============================================================ */

/**
 * Key helper for current profile of a specific wallet.
 */
const CURRENT_PROFILE_KEY = (wallet: string) => `current_profile_${wallet}`;

/**
 * Get the last selected profile login for a wallet.
 */
export const getCurrentProfileLogin = (wallet: string): string | null => {
  if (!wallet) return null;
  try {
    return localStorage.getItem(CURRENT_PROFILE_KEY(wallet));
  } catch (err) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_READ_FAILED}:`, err);
    return null;
  }
};

/**
 * Save or remove the currently selected profile login for a wallet.
 */
export const saveCurrentProfileLogin = (
  wallet: string,
  login: string | null
): void => {
  if (!wallet) return;
  try {
    const key = CURRENT_PROFILE_KEY(wallet);
    if (login) {
      localStorage.setItem(key, login);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_WRITE_FAILED}:`, err);
  }
};

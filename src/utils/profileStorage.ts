import { ErrorCode } from "../errors/ErrorCodes";

/**
 * Represents a locally stored user profile tied to a specific wallet.
 */
export interface Profile {
  address: string;
  wallet: string;
  login: string;
  valid: boolean;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
}

const STORAGE_PREFIX = "profiles_";

/**
 * Safely parses a JSON string into a Profile[].
 * Returns [] if data is invalid or parsing fails.
 */
function safeParseProfiles(data: string | null): Profile[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => typeof p.login === "string" && !!p.login);
    }
    return [];
  } catch {
    console.warn("⚠️ Corrupted profile storage detected. Clearing entry.");
    return [];
  }
}

/**
 * Retrieves all saved profiles for a specific wallet.
 */
export const getProfiles = (wallet: string): Profile[] => {
  if (!wallet) return [];
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + wallet);
    return safeParseProfiles(stored);
  } catch (err) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_READ_FAILED}:`, err);
    return [];
  }
};

/**
 * Saves the provided list of profiles for the given wallet.
 */
export const saveProfiles = (wallet: string, profiles: Profile[]): void => {
  if (!wallet) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + wallet, JSON.stringify(profiles));
  } catch (err) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_WRITE_FAILED}:`, err);
  }
};

/**
 * Clears all profiles associated with a specific wallet.
 */
export const clearProfiles = (wallet: string): void => {
  try {
    localStorage.removeItem(STORAGE_PREFIX + wallet);
  } catch (err) {
    console.error(`❌ ${ErrorCode.LOCAL_STORAGE_CLEAR_FAILED}:`, err);
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

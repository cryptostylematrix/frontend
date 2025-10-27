import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getProfiles,
  saveProfiles,
  getCurrentProfileLogin,
  saveCurrentProfileLogin,
  type Profile,
} from "../utils/profileStorage";
import {
  getProfile,
  updateProfile,
  createProfile as createProfileService,
  type ProfileResult,
} from "../services/profileService";
import { ErrorCode } from "../errors/ErrorCodes";
import { TonConnectUI } from "@tonconnect/ui-react";

interface ProfileContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  isChecking: boolean;

  createProfile: (
    wallet: string,
    login: string,
    imageUrl?: string,
    firstName?: string,
    lastName?: string,
    tgUsername?: string
  ) => Promise<ProfileResult>;

  addProfile: (wallet: string, login: string) => Promise<ProfileResult>;
  updateCurrentProfile: (
    wallet: string,
    updates: Partial<Profile>
  ) => Promise<ProfileResult>;
  removeProfile: (wallet: string, login: string) => void;
  setCurrentProfile: (profile: Profile | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{
  wallet: string;
  tonConnectUI: TonConnectUI;
  children: React.ReactNode;
}> = ({ wallet, tonConnectUI, children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Refresh stored profiles and validate via service
   */
  const refreshProfiles = useCallback(async (wallet: string) => {
    if (!wallet) {
      setProfiles([]);
      setCurrentProfile(null);
      return;
    }

    const stored = getProfiles(wallet);
    if (stored.length === 0) {
      setProfiles([]);
      setCurrentProfile(null);
      return;
    }

    setIsChecking(true);

    const validated = await Promise.all(
      stored.map(async (p) => {
        const result = await getProfile(wallet, p.login);
        return result.success
          ? { ...p, valid: true, ...result.data }
          : { ...p, valid: false };
      })
    );

    saveProfiles(wallet, validated);
    setProfiles(validated);

    // Try to restore previously selected profile
    const savedLogin = getCurrentProfileLogin(wallet);
    const matched = validated.find((p) => p.login === savedLogin && p.valid);
    const firstValid = validated.find((p) => p.valid);
    const nextProfile = matched || firstValid || validated[0] || null;

    setCurrentProfile(nextProfile);
    setIsChecking(false);
  }, []);

  /**
   * Add an existing profile
   */
  const addProfile = useCallback(
    async (wallet: string, login: string): Promise<ProfileResult> => {
      const result = await getProfile(wallet, login);
      if (!result.success) return result;

      const profile: Profile = { ...result.data, wallet, valid: true };
      const updated = [
        ...profiles.filter((p) => p.login !== profile.login),
        profile,
      ];
      saveProfiles(wallet, updated);
      setProfiles(updated);
      setCurrentProfile(profile);
      saveCurrentProfileLogin(wallet, profile.login);

      return result;
    },
    [profiles]
  );

  /**
   * Create a new profile
   */
  const createProfile = useCallback(
    async (
      wallet: string,
      login: string,
      imageUrl?: string,
      firstName?: string,
      lastName?: string,
      tgUsername?: string
    ): Promise<ProfileResult> => {
      const result = await createProfileService(
        tonConnectUI,
        wallet,
        login,
        imageUrl,
        firstName,
        lastName,
        tgUsername
      );
      if (!result.success) return result;

      const profile: Profile = { ...result.data, wallet, valid: true };
      const updated = [
        ...profiles.filter((p) => p.login !== profile.login),
        profile,
      ];
      saveProfiles(wallet, updated);
      setProfiles(updated);
      setCurrentProfile(profile);
      saveCurrentProfileLogin(wallet, profile.login);

      return result;
    },
    [profiles]
  );

  /**
   * Update current profile
   */
  const updateCurrentProfile = useCallback(
    async (wallet: string, updates: Partial<Profile>): Promise<ProfileResult> => {
      if (!currentProfile) {
        return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
      }

      const result = await updateProfile(
        tonConnectUI,
        wallet,
        currentProfile.login,
        updates.imageUrl,
        updates.firstName,
        updates.lastName,
        updates.tgUsername
      );

      if (!result.success) return result;

      const updatedProfile: Profile = {
        ...currentProfile,
        ...updates,
        valid: true,
      };

      setProfiles((prev) => {
        const next = prev.map((p) =>
          p.login === updatedProfile.login ? updatedProfile : p
        );
        saveProfiles(wallet, next);
        return next;
      });

      setCurrentProfile(updatedProfile);
      saveCurrentProfileLogin(wallet, updatedProfile.login);

      return result;
    },
    [currentProfile]
  );

  /**
   * Remove profile
   */
  const removeProfile = useCallback((wallet: string, login: string) => {
    if (!wallet) return;

    setProfiles((prev) => {
      const updated = prev.filter((p) => p.login !== login);
      saveProfiles(wallet, updated);

      const next = updated.find((p) => p.valid) || updated[0] || null;
      setCurrentProfile(next);
      saveCurrentProfileLogin(wallet, next ? next.login : null);

      return updated;
    });
  }, []);

  /**
   * Refresh when wallet changes
   */
  useEffect(() => {
    refreshProfiles(wallet);
  }, [wallet, refreshProfiles]);

  /**
   * Context value
   */
  const contextValue: ProfileContextType = {
    profiles,
    currentProfile,
    isChecking,
    createProfile,
    addProfile,
    updateCurrentProfile,
    removeProfile,
    setCurrentProfile: (profile) => {
      setCurrentProfile(profile);
      saveCurrentProfileLogin(wallet, profile ? profile.login : null);
    },
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

/**
 * Safe consumer hook
 */
export const useProfileContext = (): ProfileContextType => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return ctx;
};

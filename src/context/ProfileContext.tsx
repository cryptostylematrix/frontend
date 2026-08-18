import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TonConnectUI } from "@tonconnect/ui-react";
import {
  getLegacyProfileStorage,
  getCurrentProfileLogin,
  saveLegacyProfileStorage,
  saveCurrentProfileLogin,
  type Profile,
} from "../utils/profileStorage";
import {
  updateProfile,
  createProfile as createProfileService,
  type ProfileResult,
} from "../services/profileService";
import {
  addProfileIntent,
  checkWalletProfiles,
  getWalletProfiles,
  removeProfileIntent,
  type WalletProfileResponse,
} from "../services/uiProfileApi";
import { ErrorCode } from "../errors/ErrorCodes";

type ProfileOperationResult =
  | { success: true }
  | { success: false; errors: ErrorCode[] };

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
    tgUsername?: string,
  ) => Promise<ProfileResult>;
  addProfile: (
    wallet: string,
    login: string,
    options?: { allowPreview?: boolean },
  ) => Promise<AddProfileResult>;
  updateCurrentProfile: (
    wallet: string,
    updates: Partial<Profile>,
  ) => Promise<ProfileResult>;
  removeProfile: (
    wallet: string,
    login: string,
  ) => Promise<ProfileOperationResult>;
  setCurrentProfile: (profile: Profile | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export type AddProfileResult =
  | ProfileResult
  | {
      success: false;
      errors: ErrorCode[];
      previewAvailable: true;
    };

const knownErrorCodes = new Set<string>(Object.values(ErrorCode));

const normalizeErrors = (errors: string[]): ErrorCode[] => {
  const normalized = errors.map((error) =>
    knownErrorCodes.has(error) ? (error as ErrorCode) : ErrorCode.UNEXPECTED,
  );
  return normalized.length > 0 ? normalized : [ErrorCode.UNEXPECTED];
};

const toProfile = (response: WalletProfileResponse): Profile => ({
  address: response.profile_addr,
  wallet: response.wallet_addr,
  login: response.login.trim().toLowerCase(),
  valid: true,
  mode: response.mode,
  owned: response.owned,
  imageUrl: response.content?.image_url ?? "",
  firstName: response.content?.first_name ?? undefined,
  lastName: response.content?.last_name ?? undefined,
  tgUsername: response.content?.tg_username ?? undefined,
});

const retryDelay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const ProfileProvider: React.FC<{
  wallet: string;
  tonConnectUI: TonConnectUI;
  children: React.ReactNode;
}> = ({ wallet, tonConnectUI, children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const activeWalletRef = useRef(wallet);
  activeWalletRef.current = wallet;

  const applyServerProfiles = useCallback(
    (
      walletAddress: string,
      responses: WalletProfileResponse[],
      preferredLogin?: string,
    ) => {
      if (activeWalletRef.current !== walletAddress) {
        return { profiles: [], currentProfile: null };
      }

      const nextProfiles = responses.map(toProfile);
      const selectedLogin = (
        preferredLogin ?? getCurrentProfileLogin(walletAddress) ?? ""
      )
        .trim()
        .toLowerCase();
      const nextCurrent =
        nextProfiles.find((profile) => profile.login === selectedLogin) ??
        nextProfiles[0] ??
        null;

      setProfiles(nextProfiles);
      setCurrentProfile(nextCurrent);
      saveCurrentProfileLogin(walletAddress, nextCurrent?.login ?? null);
      return { profiles: nextProfiles, currentProfile: nextCurrent };
    },
    [],
  );

  const refreshProfiles = useCallback(
    async (walletAddress: string) => {
      if (!walletAddress.trim()) {
        setProfiles([]);
        setCurrentProfile(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      try {
        const legacyStorage = getLegacyProfileStorage(walletAddress);
        if (legacyStorage.exists) {
          const failedProfiles = [];

          for (const legacyProfile of legacyStorage.profiles) {
            try {
              let operation = await addProfileIntent(
                walletAddress,
                legacyProfile.login,
                legacyProfile.mode,
              );

              if (
                !operation.success &&
                legacyProfile.mode === "owner" &&
                operation.available_modes.includes("preview")
              ) {
                operation = await addProfileIntent(
                  walletAddress,
                  legacyProfile.login,
                  "preview",
                );
              }

              if (!operation.success) failedProfiles.push(legacyProfile);
            } catch (migrationError) {
              console.error(
                `Failed to migrate profile ${legacyProfile.login}`,
                migrationError,
              );
              failedProfiles.push(legacyProfile);
            }
          }

          saveLegacyProfileStorage(walletAddress, failedProfiles);
        }

        const checked = await checkWalletProfiles(walletAddress);
        if (activeWalletRef.current !== walletAddress) return;
        applyServerProfiles(walletAddress, checked.profiles);
        if (!checked.success) {
          console.warn(
            "Some wallet profiles could not be refreshed",
            checked.errors,
          );
        }
      } catch (checkError) {
        console.error("Failed to check wallet profiles", checkError);
        setProfiles([]);
        setCurrentProfile(null);
      } finally {
        if (activeWalletRef.current === walletAddress) setIsChecking(false);
      }
    },
    [applyServerProfiles],
  );

  const addProfile = useCallback(
    async (
      walletAddress: string,
      login: string,
      options: { allowPreview?: boolean } = {},
    ): Promise<AddProfileResult> => {
      if (!walletAddress.trim()) {
        return {
          success: false,
          errors: [ErrorCode.WALLET_NOT_CONNECTED],
        };
      }

      const normalizedLogin = login.trim().toLowerCase();
      if (!normalizedLogin) {
        return { success: false, errors: [ErrorCode.INVALID_LOGIN] };
      }

      try {
        const operation = await addProfileIntent(
          walletAddress,
          normalizedLogin,
          options.allowPreview ? "preview" : "owner",
        );

        if (!operation.success) {
          const errors = normalizeErrors(operation.errors);
          if (
            !options.allowPreview &&
            operation.available_modes.includes("preview")
          ) {
            return { success: false, errors, previewAvailable: true };
          }
          return { success: false, errors };
        }

        const serverProfiles = await getWalletProfiles(walletAddress);
        const { currentProfile: addedProfile } = applyServerProfiles(
          walletAddress,
          serverProfiles,
          normalizedLogin,
        );
        if (!addedProfile || addedProfile.login !== normalizedLogin) {
          return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
        }

        return {
          success: true,
          data: {
            address: addedProfile.address,
            wallet: addedProfile.wallet,
            login: addedProfile.login,
            imageUrl: addedProfile.imageUrl,
            firstName: addedProfile.firstName,
            lastName: addedProfile.lastName,
            tgUsername: addedProfile.tgUsername,
          },
        };
      } catch (error) {
        console.error("Failed to add profile intent", error);
        return { success: false, errors: [ErrorCode.NETWORK_ERROR] };
      }
    },
    [applyServerProfiles],
  );

  const persistCreatedProfile = useCallback(
    async (walletAddress: string, login: string) => {
      const delays = [0, 2_000, 4_000, 8_000, 16_000, 32_000];

      for (const delay of delays) {
        if (delay > 0) await retryDelay(delay);
        try {
          const operation = await addProfileIntent(
            walletAddress,
            login,
            "owner",
          );
          if (operation.success) {
            const serverProfiles = await getWalletProfiles(walletAddress);
            applyServerProfiles(walletAddress, serverProfiles, login);
            return;
          }

          const retryableErrors = new Set<string>([
            ErrorCode.PROFILE_NOT_FOUND,
            ErrorCode.CONTRACT_REQUEST_FAILED,
            ErrorCode.CONTRACT_DOES_NOT_BELONG,
          ]);
          const retryable = operation.errors.some((error) =>
            retryableErrors.has(error),
          );
          if (!retryable) break;
        } catch (error) {
          console.error("Failed to persist newly created profile intent", error);
        }
      }

      console.error("Newly created profile intent could not be persisted", {
        walletAddress,
        login,
      });
    },
    [applyServerProfiles],
  );

  const createProfile = useCallback(
    async (
      walletAddress: string,
      login: string,
      imageUrl?: string,
      firstName?: string,
      lastName?: string,
      tgUsername?: string,
    ): Promise<ProfileResult> => {
      const result = await createProfileService(
        tonConnectUI,
        walletAddress,
        login,
        imageUrl,
        firstName,
        lastName,
        tgUsername,
      );
      if (!result.success) return result;

      const profile: Profile = {
        ...result.data,
        wallet: walletAddress,
        valid: true,
        mode: "owner",
        owned: true,
      };
      setProfiles((previous) => [
        ...previous.filter((item) => item.login !== profile.login),
        profile,
      ]);
      setCurrentProfile(profile);
      saveCurrentProfileLogin(walletAddress, profile.login);

      void persistCreatedProfile(walletAddress, profile.login);
      return result;
    },
    [persistCreatedProfile, tonConnectUI],
  );

  const updateCurrentProfile = useCallback(
    async (
      walletAddress: string,
      updates: Partial<Profile>,
    ): Promise<ProfileResult> => {
      if (!currentProfile) {
        return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
      }

      const result = await updateProfile(
        tonConnectUI,
        walletAddress,
        currentProfile.login,
        updates.imageUrl,
        updates.firstName,
        updates.lastName,
        updates.tgUsername,
      );
      if (!result.success) return result;

      const updatedProfile: Profile = {
        ...currentProfile,
        ...updates,
        valid: true,
      };
      setProfiles((previous) =>
        previous.map((profile) =>
          profile.login === updatedProfile.login ? updatedProfile : profile,
        ),
      );
      setCurrentProfile(updatedProfile);
      saveCurrentProfileLogin(walletAddress, updatedProfile.login);
      return result;
    },
    [currentProfile, tonConnectUI],
  );

  const removeProfile = useCallback(
    async (
      walletAddress: string,
      login: string,
    ): Promise<ProfileOperationResult> => {
      if (!walletAddress.trim()) {
        return {
          success: false,
          errors: [ErrorCode.WALLET_NOT_CONNECTED],
        };
      }

      try {
        const operation = await removeProfileIntent(walletAddress, login);
        if (!operation.success) {
          return { success: false, errors: normalizeErrors(operation.errors) };
        }

        const nextProfiles = profiles.filter(
          (profile) => profile.login !== login.trim().toLowerCase(),
        );
        const nextCurrent = nextProfiles[0] ?? null;
        setProfiles(nextProfiles);
        setCurrentProfile(nextCurrent);
        saveCurrentProfileLogin(walletAddress, nextCurrent?.login ?? null);
        return { success: true };
      } catch (error) {
        console.error("Failed to remove profile intent", error);
        return { success: false, errors: [ErrorCode.NETWORK_ERROR] };
      }
    },
    [profiles],
  );

  useEffect(() => {
    void refreshProfiles(wallet);
  }, [wallet, refreshProfiles]);

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
      saveCurrentProfileLogin(wallet, profile?.login ?? null);
    },
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return context;
};

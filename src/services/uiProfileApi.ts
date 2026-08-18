import { appConfig } from "../config";

export type ProfileMode = "owner" | "preview";

export type WalletProfileContent = {
  login?: string | null;
  image_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  tg_username?: string | null;
};

export type WalletProfileResponse = {
  wallet_addr: string;
  profile_addr: string;
  login: string;
  mode: ProfileMode;
  owned: boolean;
  content: WalletProfileContent;
};

export type ProfileIntentOperationResponse = {
  success: boolean;
  errors: string[];
  available_modes: ProfileMode[];
};

export type CheckWalletProfilesResponse = {
  success: boolean;
  errors: string[];
  profiles: WalletProfileResponse[];
};

const normalizedBase = appConfig.uiApi.host.replace(/\/+$/, "");
const defaultOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost";

const walletProfilesUrl = (walletAddress: string, suffix = "") =>
  new URL(
    `/api/ui/wallets/${encodeURIComponent(walletAddress.trim())}/profiles${suffix}`,
    normalizedBase || defaultOrigin,
  ).toString();

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`UI profiles request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

export async function getWalletProfiles(
  walletAddress: string,
): Promise<WalletProfileResponse[]> {
  const response = await fetch(walletProfilesUrl(walletAddress));
  return readJson<WalletProfileResponse[]>(response);
}

export async function checkWalletProfiles(
  walletAddress: string,
): Promise<CheckWalletProfilesResponse> {
  const response = await fetch(walletProfilesUrl(walletAddress, "/check"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return readJson<CheckWalletProfilesResponse>(response);
}

export async function addProfileIntent(
  walletAddress: string,
  login: string,
  mode: ProfileMode,
): Promise<ProfileIntentOperationResponse> {
  const response = await fetch(walletProfilesUrl(walletAddress), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: login.trim().toLowerCase(), mode }),
  });
  return readJson<ProfileIntentOperationResponse>(response);
}

export async function removeProfileIntent(
  walletAddress: string,
  login: string,
): Promise<ProfileIntentOperationResponse> {
  const response = await fetch(
    walletProfilesUrl(
      walletAddress,
      `/${encodeURIComponent(login.trim().toLowerCase())}`,
    ),
    { method: "DELETE" },
  );
  return readJson<ProfileIntentOperationResponse>(response);
}

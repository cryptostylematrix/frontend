import { appConfig } from "../config";

export const normalizeImage = (value: string | null | undefined, login: string): string => {
  const image = value?.trim();
  if (image && image !== "https://cryptostylematrix.github.io/frontend/cs-big.png") return image;
  const url = new URL("/api/ui/avatar", appConfig.uiApi.host);
  url.searchParams.set("login", login.trim().toLowerCase());
  return url.toString();
};

export const capitalize = (str?: string | null): string | undefined => {
  if (!str?.trim()) return undefined;
  const t = str.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

export const toLower = (str?: string | null): string | undefined => {
  return str?.trim() ? str.trim().toLowerCase() : undefined;
};

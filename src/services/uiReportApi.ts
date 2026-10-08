import { appConfig } from "../config";

export type ReportPeriod = "hour" | "today" | "week" | "month" | "three_months" | "six_months" | "year";
export type ReportFilters = {
  profilePage: number; activityPage: number; period: ReportPeriod;
  groupContract: boolean; groupWalletName: boolean; groupAppVersion: boolean; groupPlatform: boolean;
};
export type UiReportData = {
  generated_at: string;
  profiles: { total_wallets: number; total_profiles: number; page: number; page_size: number;
    items: { wallet_addr: string; profile_count: number; percentage: number }[] };
  ton_connect: { total: number; groups: { contract_version: string | null; wallet_name: string | null;
    app_version: string | null; platform: string | null; count: number; percentage: number }[] };
  activity: { total: number; page: number; page_size: number; from: string; to: string;
    items: { wallet_addr: string; last_connected_at: string }[] };
  preferences: { total: number; groups: { language: string; count: number; percentage: number }[] };
};
export class ReportRequestError extends Error {
  constructor(public status: number) { super(`UI report request failed: ${status}`); }
}
const url = (path: string) => new URL(`/api/ui/reports${path}`,
  appConfig.uiApi.host.replace(/\/+$/, "") || window.location.origin);
async function read<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ReportRequestError(response.status);
  return response.json() as Promise<T>;
}
// Avoid AbortSignal.any/timeout: older Safari versions do not provide them.
async function request<T>(endpoint: URL, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 30000);
  try {
    return await read<T>(await fetch(endpoint, { cache: "no-store", signal: controller.signal }));
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
export async function getUiReport(filters: ReportFilters, signal: AbortSignal): Promise<UiReportData> {
  const endpoint = url("");
  endpoint.search = new URLSearchParams({
    profile_page: String(filters.profilePage), activity_page: String(filters.activityPage), period: filters.period,
    group_contract: String(filters.groupContract), group_wallet_name: String(filters.groupWalletName), group_app_version: String(filters.groupAppVersion), group_platform: String(filters.groupPlatform),
  }).toString();
  return request<UiReportData>(endpoint, signal);
}

export type ReportSectionResponse<T> = { generated_at: string; data: T };
async function getSection<T>(path: string, params: Record<string, string>, signal: AbortSignal): Promise<ReportSectionResponse<T>> {
  const endpoint = url(path);
  endpoint.search = new URLSearchParams(params).toString();
  return request<ReportSectionResponse<T>>(endpoint, signal);
}
export const getProfileReport = (page: number, signal: AbortSignal) =>
  getSection<UiReportData["profiles"]>("/profiles", { page: String(page) }, signal);
export const getTonConnectReport = (groups: Pick<ReportFilters, "groupContract" | "groupWalletName" | "groupAppVersion" | "groupPlatform">, signal: AbortSignal) =>
  getSection<UiReportData["ton_connect"]>("/ton-connect", {
    group_contract: String(groups.groupContract), group_wallet_name: String(groups.groupWalletName),
    group_app_version: String(groups.groupAppVersion), group_platform: String(groups.groupPlatform),
  }, signal);
export const getActivityReport = (page: number, period: ReportPeriod, signal: AbortSignal) =>
  getSection<UiReportData["activity"]>("/activity", { page: String(page), period }, signal);
export const getPreferencesReport = (signal: AbortSignal) =>
  getSection<UiReportData["preferences"]>("/preferences", {}, signal);

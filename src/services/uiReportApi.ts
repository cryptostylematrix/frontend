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
export async function getUiReport(filters: ReportFilters, signal: AbortSignal): Promise<UiReportData> {
  const endpoint = url("");
  endpoint.search = new URLSearchParams({
    profile_page: String(filters.profilePage), activity_page: String(filters.activityPage), period: filters.period,
    group_contract: String(filters.groupContract), group_wallet_name: String(filters.groupWalletName), group_app_version: String(filters.groupAppVersion), group_platform: String(filters.groupPlatform),
  }).toString();
  return read<UiReportData>(await fetch(endpoint, {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
  }));
}

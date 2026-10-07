import { appConfig } from "../config";
import { normalizeLanguageTag } from "../languages";

async function requestLanguage(wallet: string, language: string, overwrite: boolean): Promise<string> {
  const base = appConfig.uiApi.host.replace(/\/+$/, "") || window.location.origin;
  const url = new URL(`/api/ui/wallets/${encodeURIComponent(wallet)}/language${overwrite ? "" : "/resolve"}`, base);
  const response = await fetch(url, {
    method: overwrite ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Wallet language request failed: ${response.status}`);
  const result = await response.json() as { success: boolean; language: string | null; errors: string[] };
  const stored = normalizeLanguageTag(result.language);
  if (!result.success || !stored) throw new Error(`Wallet language rejected: ${result.errors?.join(", ")}`);
  return stored;
}

export const resolveWalletLanguage = (wallet: string, language: string) => requestLanguage(wallet, language, false);
export const saveWalletLanguage = (wallet: string, language: string) => requestLanguage(wallet, language, true);

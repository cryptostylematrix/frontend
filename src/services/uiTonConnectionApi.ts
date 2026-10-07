import { appConfig } from "../config";

export type TonConnectionMetadata = {
  wallet_state_init: string;
  wallet_name: string;
  app_version: string;
  platform: string;
};

export async function saveTonConnection(
  walletAddress: string,
  metadata: TonConnectionMetadata,
  signal: AbortSignal,
): Promise<void> {
  const base = appConfig.uiApi.host.replace(/\/+$/, "") || window.location.origin;
  const url = new URL(
    `/api/ui/wallets/${encodeURIComponent(walletAddress)}/ton-connection`, base,
  );
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
    signal,
  });
  if (!response.ok) throw new Error(`TON connection request failed: ${response.status}`);
  const result = await response.json() as { success: boolean; errors: string[] };
  if (!result.success) throw new Error(`TON connection rejected: ${result.errors.join(", ")}`);
}

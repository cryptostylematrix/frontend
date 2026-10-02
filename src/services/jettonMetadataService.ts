import { Address } from "@ton/core";
import { getJettonWalletMetadata } from "./contractsApi";

export type JettonMetadata = {
  decimals: number;
  symbol: string;
  name: string | null;
};

// Deduplicate concurrent UI consumers. Persistent caching belongs to the backend.
const pendingRequests = new Map<string, Promise<JettonMetadata | null>>();

export function getJettonMetadata(jettonWalletAddress: string): Promise<JettonMetadata | null> {
  let address: string;
  try { address = Address.parse(jettonWalletAddress.trim()).toRawString(); }
  catch { return Promise.resolve(null); }

  const pending = pendingRequests.get(address);
  if (pending) return pending;
  const request = getJettonWalletMetadata(address).then((metadata): JettonMetadata | null => {
    if (!metadata || !Number.isInteger(metadata.decimals) || metadata.decimals < 0 || metadata.decimals > 255) return null;
    const name = metadata.name?.trim() || null;
    return { decimals: metadata.decimals, name, symbol: metadata.symbol?.trim() || name || "JETTON" };
  }).finally(() => pendingRequests.delete(address));
  pendingRequests.set(address, request);
  return request;
}

export function formatJettonAmount(
  amount: number | string | bigint,
  decimals: number,
) {
  const value = BigInt(amount);
  if (decimals === 0) return value.toString();

  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

import { Address } from "@ton/core";
import { appConfig } from "../config";

export function normalizeWalletAddress(address: string): string {
  try { return Address.parse(address).toRawString(); } catch { return ""; }
}
const allowedWallets = new Set(appConfig.availableTestPrograms.walletAddresses
  .map(normalizeWalletAddress).filter(Boolean));
export function canViewTestPrograms(wallet: string): boolean {
  return allowedWallets.has(normalizeWalletAddress(wallet));
}

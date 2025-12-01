import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, toNano, type Cell } from "@ton/core";
import { Multi, type PlacePosData } from "../contracts/Mutli";
import { ErrorCode } from "../errors/ErrorCodes";
import { sendTransaction } from "./profileService";
import { appConfig } from "../config";

export type ContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

const MATRIX_PRICES_TON: Record<number, string> = {
  1: "15",
  2: "45",
  3: "100",
  4: "240",
  5: "500",
  6: "1200",
};

const MATRIX_FEES_TON: Record<number, string> = {
  1: "0.05",
  2: "0.05",
  3: "0.05",
  4: "0.1",
  5: "0.1",
  6: "0.1",
};

const ensureMultiAddress = (): string => {
  const addr = appConfig.multi.contractAddress?.trim();
  if (!addr) {
    throw new Error("Multi contract address is not configured");
  }
  return addr;
};

const buildPlacePos = (pos_addr?: string): PlacePosData | null => {
  const addr = pos_addr?.trim();
  return addr ? { parent: Address.parse(addr) } : null;
};

const getBuyPlaceValue = (m: number): bigint | null => {
  const price = MATRIX_PRICES_TON[m];
  const fee = MATRIX_FEES_TON[m];
  if (!price || !fee) return null;
  return toNano(price) + toNano(fee);
};

const getMatrixFeeValue = (m: number): bigint | null => {
  const fee = MATRIX_FEES_TON[m];
  return fee ? toNano(fee) : null;
};

const submitMultiTx = async (tonConnectUI: TonConnectUI, body: Cell, amount: bigint = toNano("0.01")): Promise<ContractResult> => {
  try {
    const target = ensureMultiAddress();
    const result = await sendTransaction(tonConnectUI, target, amount, body);
    if (!result.success) {
      return { success: false, error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED };
    }
    return { success: true };
  } catch (err) {
    console.error("Multi tx error:", err);
    return { success: false, error_code: ErrorCode.UNEXPECTED };
  }
};

export async function buyPlace(
  tonConnectUI: TonConnectUI,
  m: number,
  profile_addr: string,
  pos_addr: string | undefined
): Promise<ContractResult> {
  const value = getBuyPlaceValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const body = Multi.buyPlaceMessage(m, Address.parse(profile_addr), buildPlacePos(pos_addr), Date.now());
  return submitMultiTx(tonConnectUI, body, value);
}

export async function lockPos(
  tonConnectUI: TonConnectUI,
  query_id: number,
  m: number,
  profile_addr: string,
  pos_addr: string
): Promise<ContractResult> {
  const pos = buildPlacePos(pos_addr);
  if (!pos) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const value = getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const body = Multi.lockPosMessage(m, Address.parse(profile_addr), pos, query_id);
  return submitMultiTx(tonConnectUI, body, value);
}

export async function unlockPos(
  tonConnectUI: TonConnectUI,
  query_id: number,
  m: number,
  profile_addr: string,
  pos_addr: string
): Promise<ContractResult> {
  const pos = buildPlacePos(pos_addr);
  if (!pos) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const value = getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const body = Multi.unlockPosMessage(m, Address.parse(profile_addr), pos, query_id);
  return submitMultiTx(tonConnectUI, body, value);
}

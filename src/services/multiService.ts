import type { TonConnectUI } from "@tonconnect/ui-react";
import { Cell, toNano } from "@ton/core";
import type { PlacePosData } from "../types/multi";
import { ErrorCode } from "../errors/ErrorCodes";
import { sendTransaction } from "./tonConnectService";
import {
  buildBuyPlaceBody,
  buildLockPosBody,
  buildUnlockPosBody,
  getMultiData,
  type MultiDataResponse,
  type MultiFeesDataResponse,
  type MultiPricesDataResponse,
} from "./contractsApi";

export type ContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

const ensureMultiAddress = async (): Promise<string> => {
  const data = await getMultiData();
  const addr = data?.addr?.trim();
  if (!addr) {
    throw new Error("Multi contract address is not configured");
  }
  return addr;
};

// const buildPlacePos = (pos_addr?: string): PlacePosData | null => {
//   const addr = pos_addr?.trim();
//   return addr ? { parent: Address.parse(addr) } : null;
// };

const getFeeFromData = (data: MultiDataResponse | null, m: number): string | null => {
  if (!data) return null;
  const key = `m${m}` as keyof MultiFeesDataResponse;
  if (!data.fees || !(key in data.fees)) return null;
  const fee = data.fees[key];
  return fee !== undefined && fee !== null ? fee.toString() : null;
};

const getPriceFromData = (data: MultiDataResponse | null, m: number): string | null => {
  if (!data) return null;
  const key = `m${m}` as keyof MultiPricesDataResponse;
  if (!data.prices || !(key in data.prices)) return null;
  const price = data.prices[key];
  return price !== undefined && price !== null ? price.toString() : null;
};

const getBuyPlaceValue = async (m: number): Promise<bigint | null> => {
  const data = await getMultiData();
  const price = getPriceFromData(data, m);
  const fee = getFeeFromData(data, m);
  if (!price || !fee) return null;
  return toNano(price) + toNano(fee);
};

const getMatrixFeeValue = async (m: number): Promise<bigint | null> => {
  const data = await getMultiData();
  const fee = getFeeFromData(data, m);
  return fee ? toNano(fee) : null;
};

const submitMultiTx = async (tonConnectUI: TonConnectUI, body: Cell, amount: bigint = toNano("0.01")): Promise<ContractResult> => {
  try {
    const target = await ensureMultiAddress();
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
  pos: PlacePosData | null,
): Promise<ContractResult> {
  const value = await getBuyPlaceValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const profileAddress = profile_addr?.trim();
  if (!profileAddress) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const bodyResponse = await buildBuyPlaceBody({
    m,
    profileAddr: profileAddress,
    parentAddr: pos?.parent?.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    pos: pos?.pos,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const body = Cell.fromHex(bocHex);
  return submitMultiTx(tonConnectUI, body, value);
}

export async function lockPos(
  tonConnectUI: TonConnectUI,
  _query_id: number,
  m: number,
  profile_addr: string,
  pos: PlacePosData
): Promise<ContractResult> {
  void _query_id; // query id currently unused by backend; keep for API symmetry
  const value = await getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const profileAddress = profile_addr?.trim();
  const parentAddress = pos?.parent;
  if (!profileAddress || !parentAddress || pos.pos === undefined || pos.pos === null) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const bodyResponse = await buildLockPosBody({
    m,
    profileAddr: profileAddress,
    parentAddr: parentAddress.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    pos: pos.pos,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const body = Cell.fromHex(bocHex);
  return submitMultiTx(tonConnectUI, body, value);
}

export async function unlockPos(
  tonConnectUI: TonConnectUI,
  _query_id: number,
  m: number,
  profile_addr: string,
  pos: PlacePosData
): Promise<ContractResult> {
  void _query_id; // query id currently unused by backend; keep for API symmetry
  const value = await getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const profileAddress = profile_addr?.trim();
  const parentAddress = pos?.parent;
  if (!profileAddress || !parentAddress || pos.pos === undefined || pos.pos === null) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const bodyResponse = await buildUnlockPosBody({
    m,
    profileAddr: profileAddress,
    parentAddr: parentAddress.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    pos: pos.pos,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const body = Cell.fromHex(bocHex);
  return submitMultiTx(tonConnectUI, body, value);
}

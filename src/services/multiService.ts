import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, beginCell, toNano, type Cell } from "@ton/core";
import type { PlacePosData } from "../types/multi";
import { ErrorCode } from "../errors/ErrorCodes";
import { sendTransaction } from "./tonConnectService";
import { getMultiData, type MultiDataResponse, type MultiFeesDataResponse, type MultiPricesDataResponse } from "./contractsApi";

export type ContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

const loadMultiData = async (): Promise<MultiDataResponse | null> => {
  return getMultiData();
};

const ensureMultiAddress = async (): Promise<string> => {
  const data = await loadMultiData();
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
  const data = await loadMultiData();
  const price = getPriceFromData(data, m);
  const fee = getFeeFromData(data, m);
  if (!price || !fee) return null;
  return toNano(price) + toNano(fee);
};

const getMatrixFeeValue = async (m: number): Promise<bigint | null> => {
  const data = await loadMultiData();
  const fee = getFeeFromData(data, m);
  return fee ? toNano(fee) : null;
};

const buildPlacePosCell = (data: PlacePosData | null): Cell | null => {
  if (!data) return null;
  return beginCell().storeAddress(data.parent).storeUint(data.pos, 1).endCell();
};

const buildBuyPlaceMessage = (m: number, profile: Address, pos: PlacePosData | null, queryId: bigint | number = 0): Cell =>
  beginCell()
    .storeUint(0x179b74a8, 32) // buy_place
    .storeUint(queryId, 64)
    .storeUint(m, 3)
    .storeAddress(profile)
    .storeMaybeRef(buildPlacePosCell(pos))
    .endCell();

const buildLockPosMessage = (m: number, profile: Address, pos: PlacePosData, queryId: bigint | number = 0): Cell =>
  beginCell()
    .storeUint(0x6d31ad42, 32) // lock_pos
    .storeUint(queryId, 64)
    .storeUint(m, 3)
    .storeAddress(profile)
    .storeRef(buildPlacePosCell(pos)!)
    .endCell();

const buildUnlockPosMessage = (m: number, profile: Address, pos: PlacePosData, queryId: bigint | number = 0): Cell =>
  beginCell()
    .storeUint(0x77d27591, 32) // unlock_pos
    .storeUint(queryId, 64)
    .storeUint(m, 3)
    .storeAddress(profile)
    .storeRef(buildPlacePosCell(pos)!)
    .endCell();

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

  const body = buildBuyPlaceMessage(m, Address.parse(profile_addr), pos, Date.now());
  return submitMultiTx(tonConnectUI, body, value);
}

export async function lockPos(
  tonConnectUI: TonConnectUI,
  query_id: number,
  m: number,
  profile_addr: string,
  pos: PlacePosData
): Promise<ContractResult> {
  const value = await getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const body = buildLockPosMessage(m, Address.parse(profile_addr), pos, query_id);
  return submitMultiTx(tonConnectUI, body, value);
}

export async function unlockPos(
  tonConnectUI: TonConnectUI,
  query_id: number,
  m: number,
  profile_addr: string,
  pos: PlacePosData
): Promise<ContractResult> {
  const value = await getMatrixFeeValue(m);
  if (!value) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  const body = buildUnlockPosMessage(m, Address.parse(profile_addr), pos, query_id);
  return submitMultiTx(tonConnectUI, body, value);
}

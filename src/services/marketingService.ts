import type { TonConnectUI } from "@tonconnect/ui-react";
import { Cell, toNano } from "@ton/core";
import type { PlacePosData } from "../types/multi";
import { ErrorCode } from "../errors/ErrorCodes";
import { sendTransaction } from "./tonConnectService";
import {
  buildMarketingBuyPlaceByJettonBody,
  buildMarketingBuyPlaceByTonBody,
  buildMarketingLockPosBody,
  buildMarketingUnlockPosBody,
  getJettonWalletAddress,
  getJettonWalletData,
  getMarketingData,
} from "./contractsApi";
import { getTotalPlaceCount } from "./marketingApi";

export type ContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

const toOptionalPos = (pos: PlacePosData | null) => ({
  parentAddr: pos?.parent?.toString({ urlSafe: true, bounceable: true, testOnly: false }),
  pos: pos?.pos,
});

const toRawBigInt = (value: number | string | undefined | null): bigint => {
  if (value === undefined || value === null) return 0n;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  return BigInt(value);
};

const toNanoBigInt = (value: number | string | undefined | null): bigint => {
  if (value === undefined || value === null) return 0n;
  return toNano(String(value));
};

export const getRawBuyAmount = async (marketingAddr: string, m: number, profileAddr: string): Promise<bigint | null> => {
  const data = await getMarketingData(marketingAddr);
  const price = data?.matrixes?.[String(m)]?.price;
  if (price === undefined || price === null) return null;

  const totalPlacesCount = await getTotalPlaceCount(marketingAddr, profileAddr);
  const initialFee = totalPlacesCount === 0 ? toRawBigInt(data?.initial_fee) : 0n;
  return toRawBigInt(price) + initialFee;
};

const submitMarketingTx = async (
  tonConnectUI: TonConnectUI,
  target: string,
  body: Cell,
  amount: bigint,
): Promise<ContractResult> => {
  try {
    const result = await sendTransaction(tonConnectUI, target, amount, body);
    if (!result.success) {
      return { success: false, error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED };
    }
    return { success: true };
  } catch (err) {
    console.error("Marketing tx error:", err);
    return { success: false, error_code: ErrorCode.UNEXPECTED };
  }
};

export async function buyPlaceByTon(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  m: number,
  profileAddr: string,
  pos: PlacePosData | null,
): Promise<ContractResult> {
  const marketingAddress = marketingAddr?.trim();
  const profileAddress = profileAddr?.trim();
  if (!marketingAddress || !profileAddress || !Number.isFinite(m)) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const totalPlacesCount = await getTotalPlaceCount(marketingAddress, profileAddress);
  const amount = await getRawBuyAmount(marketingAddress, m, profileAddress);
  if (!amount) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const bodyResponse = await buildMarketingBuyPlaceByTonBody({
    m,
    profileAddr: profileAddress,
    first: totalPlacesCount === 0,
    ...toOptionalPos(pos),
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  return submitMarketingTx(tonConnectUI, marketingAddress, Cell.fromHex(bocHex), amount);
}

export async function buyPlaceByJetton(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  m: number,
  profileAddr: string,
  senderAddr: string,
  pos: PlacePosData | null,
): Promise<ContractResult> {
  const marketingAddress = marketingAddr?.trim();
  const profileAddress = profileAddr?.trim();
  const senderAddress = senderAddr?.trim();
  if (!marketingAddress || !profileAddress || !senderAddress || !Number.isFinite(m)) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const data = await getMarketingData(marketingAddress);
  const jettonWalletAddr = data?.jetton_wallet_addr?.trim();
  const amount = await getRawBuyAmount(marketingAddress, m, profileAddress);
  if (!jettonWalletAddr || !amount) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const totalPlacesCount = await getTotalPlaceCount(marketingAddress, profileAddress);
  const rawFee = data?.fees?.[String(m)];
  if (rawFee === undefined || rawFee === null) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const fee = toRawBigInt(rawFee);

  const bodyResponse = await buildMarketingBuyPlaceByJettonBody({
    marketingAddr: marketingAddress,
    m,
    profileAddr: profileAddress,
    first: totalPlacesCount === 0,
    amount,
    senderAddr: senderAddress,
    fee,
    ...toOptionalPos(pos),
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const marketingJettonWalletData = await getJettonWalletData(jettonWalletAddr);
  const minterAddr = marketingJettonWalletData?.minter_addr?.trim();
  if (!minterAddr) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  const senderJettonWallet = await getJettonWalletAddress(minterAddr, senderAddress);
  const senderJettonWalletAddr = senderJettonWallet?.wallet_addr?.trim();
  if (!senderJettonWalletAddr) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  return submitMarketingTx(tonConnectUI, senderJettonWalletAddr, Cell.fromHex(bocHex), fee + toNano("0.05"));
}

export async function lockPos(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  m: number,
  profileAddr: string,
  pos: PlacePosData,
): Promise<ContractResult> {
  const marketingAddress = marketingAddr?.trim();
  const profileAddress = profileAddr?.trim();
  if (!marketingAddress || !profileAddress || !Number.isFinite(m)) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const data = await getMarketingData(marketingAddress);
  const rawFee = data?.fees?.[String(m)];
  if (rawFee === undefined || rawFee === null) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const bodyResponse = await buildMarketingLockPosBody({
    m,
    profileAddr: profileAddress,
    parentAddr: pos.parent.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    pos: pos.pos,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  return submitMarketingTx(tonConnectUI, marketingAddress, Cell.fromHex(bocHex), toNanoBigInt(rawFee));
}

export async function unlockPos(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  m: number,
  profileAddr: string,
  pos: PlacePosData,
): Promise<ContractResult> {
  const marketingAddress = marketingAddr?.trim();
  const profileAddress = profileAddr?.trim();
  if (!marketingAddress || !profileAddress || !Number.isFinite(m)) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const data = await getMarketingData(marketingAddress);
  const rawFee = data?.fees?.[String(m)];
  if (rawFee === undefined || rawFee === null) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  const bodyResponse = await buildMarketingUnlockPosBody({
    m,
    profileAddr: profileAddress,
    parentAddr: pos.parent.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    pos: pos.pos,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };

  return submitMarketingTx(tonConnectUI, marketingAddress, Cell.fromHex(bocHex), toNanoBigInt(rawFee));
}

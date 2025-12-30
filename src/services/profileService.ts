// src/services/profileService.ts
import { ErrorCode } from "../errors/ErrorCodes";
import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, beginCell, toNano, type Cell } from "@ton/core";
import { getCollectionData, getNftAddrByLogin } from "./contractsApi";
import { sendTransaction } from "./tonConnectService";
import {
  buildDeployItemBody,
  buildEditContentBody,
  capitalize,
  normalizeImage,
  profileToNftContent,
  toLower,
} from "./nftContentHelper";
import { nftContentToCell } from "./ProfileContent";

const buildChooseInviterBody = (
  program: number,
  inviter: Address,
  seqNo: number,
  invite: Address,
  queryId: bigint | number = 0,
): Cell =>
  beginCell()
    .storeUint(0xef27e2d6, 32) // ITEM_CHOOSE_INVITER
    .storeUint(queryId, 64)
    .storeUint(program, 32)
    .storeAddress(inviter)
    .storeUint(seqNo, 32)
    .storeAddress(invite)
    .endCell();

export type ProfileResult =
  | {
      success: true;
      data: {
        address: string;
        wallet: string;
        login: string;
        imageUrl?: string;
        firstName?: string;
        lastName?: string;
        tgUsername?: string;
      };
    }
  | { success: false; errors: ErrorCode[] };

// kept for backward compatibility: prefer chooseInviterCommand in api/commands
export async function chooseInviter(
  tonConnectUI: TonConnectUI,
  profile_addr: string,
  program: number,
  inviter_addr: string,
  seqNo: number,
  invite_addr: string,
): Promise<{ success: boolean; errors?: ErrorCode[] }> {
  if (!profile_addr?.trim() || !inviter_addr?.trim() || !invite_addr?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const body = buildChooseInviterBody(program, Address.parse(inviter_addr), seqNo, Address.parse(invite_addr), Date.now());

    await sendTransaction(tonConnectUI, profile_addr, toNano("0.05"), body);
    return { success: true };
  } catch (err) {
    console.error("chooseInviter error:", err);
    return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
  }
}

/**
 * Create a new profile (sends a TON message).
 */
export async function createProfile(
  tonConnectUI: TonConnectUI,
  wallet: string,
  login: string,
  imageUrl?: string,
  firstName?: string,
  lastName?: string,
  tgUsername?: string,
): Promise<ProfileResult> {
  // Validate base inputs
  if (!wallet) return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };

  if (!login.trim()) return { success: false, errors: [ErrorCode.INVALID_LOGIN] };

  // ---- Normalize all fields ----
  const normalizedLogin = toLower(login)!;
  const normalizedImageUrl = normalizeImage();
  const normalizedFirstName = capitalize();
  const normalizedLastName = capitalize();
  const normalizedTgUsername = toLower();

  // ---- Prepare NFT content ----
  const nftContent = profileToNftContent(
    login,
    imageUrl,
    firstName,
    lastName,
    tgUsername,
  );

  const contentCell = nftContentToCell(nftContent);

  // ---- Create body for deploy transaction ----
  const body = buildDeployItemBody(contentCell, normalizedLogin);

  const collectionAddressStr = (await getCollectionData())?.addr;
  if (!collectionAddressStr) return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };

  // ---- Send transaction ----
  const tx = await sendTransaction(tonConnectUI, collectionAddressStr, toNano("0.05"), body);

  if (!tx.success) return { success: false, errors: tx.errors ?? [] };

  // ---- Derive NFT address from login ----
  const nftAddr = await getNftAddrByLogin(normalizedLogin);
  if (!nftAddr?.addr) {
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }

  // ---- Return normalized data ----
  return {
    success: true,
    data: {
      address: nftAddr.addr,
      wallet: wallet.trim(),
      login: normalizedLogin,
      imageUrl: normalizedImageUrl,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      tgUsername: normalizedTgUsername,
    },
  };
}

/**
 * Update existing profile (sends a TON message).
 */
export async function updateProfile(
  tonConnectUI: TonConnectUI,
  wallet: string,
  login: string,
  imageUrl?: string,
  firstName?: string,
  lastName?: string,
  tgUsername?: string,
): Promise<ProfileResult> {
  // ---- Validate input ----
  if (!wallet) return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };

  if (!login.trim()) return { success: false, errors: [ErrorCode.INVALID_LOGIN] };

  // ---- Normalize all fields ----
  const normalizedLogin = toLower(login)!;
  const normalizedImageUrl = normalizeImage(imageUrl);
  const normalizedFirstName = capitalize(firstName);
  const normalizedLastName = capitalize(lastName);
  const normalizedTgUsername = toLower(tgUsername);

  try {
    // ---- Fetch item address ----
    const nftAddr = await getNftAddrByLogin(normalizedLogin);
    const itemAddress = nftAddr?.addr ? Address.parse(nftAddr.addr) : null;

    if (!itemAddress) {
      return {
        success: false,
        errors: [ErrorCode.CONTRACT_DOES_NOT_BELONG],
      };
    }

    // ---- Build new on-chain content ----
    const nftContent = profileToNftContent(
      normalizedLogin,
      normalizedImageUrl,
      normalizedFirstName,
      normalizedLastName,
      normalizedTgUsername,
    );

    const body = buildEditContentBody(nftContentToCell(nftContent));

    // ---- Send transaction ----
    const tx = await sendTransaction(
      tonConnectUI,
      itemAddress.toString({ urlSafe: true, bounceable: true, testOnly: false }),
      toNano("0.01"),
      body,
    );

    if (!tx.success) return { success: false, errors: tx.errors ?? [] };

    // ---- Return normalized profile ----
    return {
      success: true,
      data: {
        address: itemAddress.toString({ urlSafe: true, bounceable: true, testOnly: false }),
        wallet: wallet.trim(),
        login: normalizedLogin,
        imageUrl: normalizedImageUrl,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        tgUsername: normalizedTgUsername,
      },
    };
  } catch (err) {
    console.error("updateProfile error:", err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}

export { profileToNftContent };

/**
 * Get an existing profile by wallet + login.
 */

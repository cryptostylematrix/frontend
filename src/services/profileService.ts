// src/services/profileService.ts
import { ErrorCode } from "../errors/ErrorCodes";
import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, Cell, toNano } from "@ton/core";
import { contractsApi, getCollectionData, getNftAddrByLogin } from "./contractsApi";
import { sendTransaction } from "./tonConnectService";
import { capitalize, normalizeImage, toLower } from "./nftContentHelper";

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
  inviter_addr: string,
  seqNo: number,
  invite_addr: string,
): Promise<{ success: boolean; errors?: ErrorCode[] }> {
  if (!profile_addr?.trim() || !inviter_addr?.trim() || !invite_addr?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const result = await contractsApi.buildMultiChooseInviterBody({
      inviterAddr: inviter_addr,
      seqNo,
      inviteAddr: invite_addr,
    });
    const bocHex = result?.boc_hex;
    if (!bocHex) {
      return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
    }

    const body = Cell.fromHex(bocHex);

    const tx = await sendTransaction(tonConnectUI, profile_addr.trim(), toNano("0.05"), body);
    if (!tx.success) {
      return { success: false, errors: tx.errors ?? [ErrorCode.TRANSACTION_FAILED] };
    }

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
  const normalizedImageUrl = normalizeImage(imageUrl);
  const normalizedFirstName = capitalize(firstName);
  const normalizedLastName = capitalize(lastName);
  const normalizedTgUsername = toLower(tgUsername);

  // ---- Build deploy body via API ----
  const bodyResponse = await contractsApi.buildDeployItemBody({
    login: normalizedLogin,
    imageUrl: normalizedImageUrl,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    tgUsername: normalizedTgUsername,
  });

  const bocHex = bodyResponse?.boc_hex;
  if (!bocHex) {
    return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
  }

  const body = Cell.fromHex(bocHex);

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

// function toBoc(cell: Cell, opts?: {
//         idx?: boolean | null | undefined;
//         crc32?: boolean | null | undefined;
//     }): Buffer {
//         let idx =
//             opts && opts.idx !== null && opts.idx !== undefined
//                 ? opts.idx
//                 : false;
//         let crc32 =
//             opts && opts.crc32 !== null && opts.crc32 !== undefined
//                 ? opts.crc32
//                 : true;
//         return serializeBoc(cell, { idx, crc32 });
//     }

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

    const bodyResponse = await contractsApi.buildEditContentBody({
      login: normalizedLogin,
      imageUrl: normalizedImageUrl,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      tgUsername: normalizedTgUsername,
    });

    const bocHex = bodyResponse?.boc_hex;
    if (!bocHex) {
      return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
    }

    const body = Cell.fromHex(bocHex);


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

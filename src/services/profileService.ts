// src/services/profileService.ts
import { ErrorCode } from "../errors/ErrorCodes";
import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, Cell, toNano } from "@ton/core";
import { contractsApi, getCollectionData, getNftAddrByLogin } from "./contractsApi";
import { getTonClient } from "./tonClient";
import { sendTransaction } from "./tonConnectService";
import { capitalize, normalizeImage, toLower } from "./nftContentHelper";
import { isValidProfileLogin } from "../utils/profileLogin";

export const ProfilePrograms = {
  neo: 0x435acabf,
} as const;

export type ProfileProgram = (typeof ProfilePrograms)[keyof typeof ProfilePrograms];

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
  program: ProfileProgram = ProfilePrograms.neo,
): Promise<{ success: boolean; errors?: ErrorCode[] }> {
  if (!profile_addr?.trim() || !inviter_addr?.trim() || !invite_addr?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const result = await contractsApi.buildChooseInviterBody({
      program,
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

export type PendingProfileCreation = {
  wallet: string;
  login: string;
  address: string;
  collectionAddress: string;
};

export type ProfileCreationOptions = {
  pending?: PendingProfileCreation;
  onSubmitted?: (pending: PendingProfileCreation) => void;
};

export type ProfileCreationResult = ProfileResult | {
  success: false;
  errors: ErrorCode[];
  pending: PendingProfileCreation;
};

async function confirmProfileCreation(
  pending: PendingProfileCreation,
): Promise<ProfileCreationResult> {
  // A submitted wallet message is not proof that the collection deployed an NFT.
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 5_000));
    try {
      const profile = await contractsApi.getProfileNftData(pending.address);
      if (profile?.is_init !== -1) continue;
      if (!profile.owner_addr ||
          !Address.parse(profile.owner_addr).equals(Address.parse(pending.wallet))) {
        return { success: false, errors: [ErrorCode.CONTRACT_DOES_NOT_BELONG] };
      }
      if (!Address.parse(profile.collection_addr).equals(Address.parse(pending.collectionAddress)) ||
          profile.content?.login !== pending.login) continue;
      return {
        success: true,
        data: {
          address: pending.address,
          wallet: pending.wallet,
          login: pending.login,
          imageUrl: profile.content.image_url ?? undefined,
          firstName: profile.content.first_name ?? undefined,
          lastName: profile.content.last_name ?? undefined,
          tgUsername: profile.content.tg_username ?? undefined,
        },
      };
    } catch {
      // Read failures leave confirmation pending; they do not prove rejection.
    }
  }
  return { success: false, errors: [ErrorCode.PROFILE_CREATION_UNCONFIRMED], pending };
}

/** Submit once, then confirm deployment; retries only read the expected NFT. */
export async function createProfile(
  tonConnectUI: TonConnectUI,
  wallet: string,
  login: string,
  imageUrl?: string,
  firstName?: string,
  lastName?: string,
  tgUsername?: string,
  options: ProfileCreationOptions = {},
): Promise<ProfileCreationResult> {
  if (!wallet) return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };
  const normalizedLogin = login.trim().toLowerCase();
  if (!isValidProfileLogin(normalizedLogin)) {
    return { success: false, errors: [ErrorCode.INVALID_PROFILE_LOGIN_FORMAT] };
  }

  try {
    const owner = Address.parse(wallet);
    if (options.pending) {
      if (!owner.equals(Address.parse(options.pending.wallet)) || normalizedLogin !== options.pending.login) {
        return { success: false, errors: [ErrorCode.INVALID_PAYLOAD] };
      }
      return await confirmProfileCreation(options.pending);
    }

    const nftAddr = await getNftAddrByLogin(normalizedLogin);
    if (!nftAddr?.addr) return { success: false, errors: [ErrorCode.CONTRACT_REQUEST_FAILED] };

    // RPC failures must not be interpreted as an available login. The contracts
    // API does not distinguish an undeployed account from a failed get method.
    const state = await getTonClient().getContractState(Address.parse(nftAddr.addr));
    if (state.state !== "uninitialized") {
      return { success: false, errors: [ErrorCode.PROFILE_EXISTS] };
    }

    const collection = await getCollectionData();
    if (!collection?.addr) return { success: false, errors: [ErrorCode.CONTRACT_REQUEST_FAILED] };
    const bodyResponse = await contractsApi.buildDeployItemBody({
      login: normalizedLogin,
      imageUrl: normalizeImage(imageUrl, normalizedLogin),
      firstName: capitalize(firstName),
      lastName: capitalize(lastName),
      tgUsername: toLower(tgUsername),
    });
    if (!bodyResponse?.boc_hex) {
      return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
    }
    const connectedWallet = tonConnectUI.account?.address;
    if (!connectedWallet || !owner.equals(Address.parse(connectedWallet))) {
      return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
    }
    const tx = await sendTransaction(tonConnectUI, collection.addr, toNano("0.05"), Cell.fromHex(bodyResponse.boc_hex));
    if (!tx.success) return { success: false, errors: tx.errors ?? [ErrorCode.TRANSACTION_FAILED] };

    const pending = { wallet, login: normalizedLogin, address: nftAddr.addr, collectionAddress: collection.addr };
    options.onSubmitted?.(pending);
    return await confirmProfileCreation(pending);
  } catch (error) {
    console.error("Profile creation check failed", error);
    return { success: false, errors: [ErrorCode.CONTRACT_REQUEST_FAILED] };
  }
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
  const normalizedImageUrl = normalizeImage(imageUrl, normalizedLogin);
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

// src/services/profileService.ts
import { ErrorCode } from "../errors/ErrorCodes";
import type { TonConnectUI } from "@tonconnect/ui-react";
import {  Address, Cell, toNano, Dictionary } from '@ton/core';
import { TonClient } from "@ton/ton";
import { ProfileCollectionV1 } from "../contracts/ProfileCollectionV1";
import { sha256n } from "../utils/cryptoHelper";
import { ProfileItemV1, ProgramDataCodec, type ProgramData } from "../contracts/ProfileItemV1";
import { type NftContentOnchain } from "../contracts/ProfileContent";
import { NFTDictValueSerializer } from "../contracts/dict";
import { sha256_sync } from "@ton/crypto";


const tonClient = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
    apiKey: "193210c5feca89e2e483c94b7e7e43797c5c3e33cd61c7e711d4868dd8a4ed04", // optional, if you have one
  });


  const nftCollectionAddress = Address.parse("EQAiWZqRPp39Z46Y4Pahvj5UQSzafJrUiTbYDcQ0kldLebjn");

/**
 * Profile structure used by service operations.
 */
export interface ProfileData {
  address: string,
  wallet: string;
  login: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
}

/**
 * Standardized result types.
 */
export type ProfileResult =
  | { success: true; data: ProfileData }
  | { success: false; errors: ErrorCode[] };

export type BalanceResult =
  | { success: true; balance: bigint }
  | { success: false; errors: ErrorCode[] };

export type ProfilePreviewResult =
  | { success: true; data: { login: string; imageUrl: string } }
  | { success: false; errors: ErrorCode[] };

export type ProfileProgramsResult =
  | { success: true; data: ProgramData | null }
  | { success: false; errors: ErrorCode[] };

export type ChooseInviterResult =
  | { success: true }
  | { success: false; errors: ErrorCode[] };

export interface NftProfileData {
  address: string;
  login: string;
  imageUrl: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
}

export type NftDataResult =
  | { success: true; data: NftProfileData }
  | { success: false; errors: ErrorCode[] };

export async function chooseInviter(
  tonConnectUI: TonConnectUI,
  profile_addr: string,
  program: number,
  inviter_addr: string,
  seqNo: number,
  invite_addr: string
): Promise<ChooseInviterResult> {
  if (!profile_addr?.trim() || !inviter_addr?.trim() || !invite_addr?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
   
    const body = ProfileItemV1.chooseInviterMessage(
      program,
      Address.parse(inviter_addr),
      seqNo,
      Address.parse(invite_addr),
      Date.now()
    );

    await sendTransaction(tonConnectUI, profile_addr, toNano("0.05"), body);

    return { success: true };
  } catch (err) {
    console.error("chooseInviter error:", err);
    return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
  }
}

// /**
//  * Helper: simulate async task delay.
//  */
// const delay = async (min = 2000, max = 5000) => {
//   const duration = min + Math.random() * (max - min);
//   return new Promise((resolve) => setTimeout(resolve, duration));
// };

// --- Normalization Helpers ---
function capitalize(str?: string): string | undefined {
  if (!str?.trim()) return undefined;
  const t = str.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function toLower(str?: string): string | undefined {
  return str?.trim() ? str.trim().toLowerCase() : undefined;
}

/**
 * Fetch program data for a specific program a profile participates in by profile address.
 */
export async function getProfileProgramData(profile_addr: string, program: number): Promise<ProfileProgramsResult> {
  if (!profile_addr?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const itemAddress = Address.parse(profile_addr.trim());
    const item = ProfileItemV1.createFromAddress(itemAddress);
    const provider = tonClient.provider(itemAddress);

    const profile_data = await item.getPrograms(provider);
    if (!profile_data.programs) return { success: true, data: null };

    const programs = Dictionary.loadDirect(
      Dictionary.Keys.Uint(32),
      ProgramDataCodec,
      profile_data.programs
    );

    return { success: true, data: programs.get(program) ?? null };
  } catch (err) {
    console.error("getProfileProgramData error:", err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}


export async function sendTransaction(
  tonConnectUI: TonConnectUI,
  address: string,
  amount: bigint,
  body: Cell
): Promise<{ success: boolean; errors?: ErrorCode[] }> {
  try {

    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 min
      messages: [
        {
          address: address,
          amount: amount.toString(),
          payload: body.toBoc().toString("base64") // encoded body
        }
      ]
    };

    await tonConnectUI.sendTransaction(tx);

    return { success: true };
  } catch (err: any) {
    console.error("TonConnect transaction error:", err);

    if (err?.message?.includes("User declined")) {
      return { success: false, errors: [ErrorCode.USER_REJECTED_TRANSACTION] };
    }

    if (err?.message?.includes("address")) {
      return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
    }

    return { success: false, errors: [ErrorCode.TRANSACTION_FAILED] };
  }
}

function packProfile(
    login: string,
    imageUrl?: string,
    firstName?: string,
    lastName?: string,
    tgUsername?: string
) {
    const capitalize = (str?: string): string | undefined =>
        str?.trim()
            ? str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase()
            : undefined;

    const toLower = (str?: string): string | undefined =>
        str?.trim() ? str.trim().toLowerCase() : undefined;

    const formattedLogin = toLower(login)!;
    const formattedImageUrl =
        toLower(imageUrl) && toLower(imageUrl) !== ''
            ? toLower(imageUrl)
            : 'https://cryptostylematrix.github.io/frontend/cs-big.png';
    const formattedFirstName = capitalize(firstName);
    const formattedLastName = capitalize(lastName);
    const formattedTgUsername = toLower(tgUsername);

    return {
        name: formattedLogin,
        description: 'Crypto Style Profile',
        image: formattedImageUrl,
        attributes: [
            { trait_type: 'firstName', value: formattedFirstName },
            { trait_type: 'lastName', value: formattedLastName },
            { trait_type: 'tgUsername', value: formattedTgUsername },
        ],
    };
}

// -------------------- PROFILE TO CELL --------------------

export function profileToNftContent(
    login: string,
    imageUrl?: string,
    firstName?: string,
    lastName?: string,
    tgUsername?: string
): NftContentOnchain {
    const profile = packProfile(login, imageUrl, firstName, lastName, tgUsername);

    const onchain: NftContentOnchain = {
        type: 'onchain',
        data: {
            name: profile.name,
            description: profile.description,
            image: profile.image,
            attributes: JSON.stringify(profile.attributes), // 👈 store attributes as JSON
        },
    };

    return onchain;
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
  tgUsername?: string
): Promise<ProfileResult> {
  // Validate base inputs
  if (!wallet)
    return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };

  if (!login.trim())
    return { success: false, errors: [ErrorCode.INVALID_LOGIN] };

  // ---- Normalize all fields ----
  const normalizedLogin = toLower(login)!;
  const normalizedImageUrl =
    toLower(imageUrl) && toLower(imageUrl) !== ''
      ? toLower(imageUrl)
      : 'https://cryptostylematrix.github.io/frontend/cs-big.png';
  const normalizedFirstName = capitalize(firstName);
  const normalizedLastName = capitalize(lastName);
  const normalizedTgUsername = toLower(tgUsername);

  // ---- Prepare NFT content ----
  const collection = ProfileCollectionV1.createFromAddress(nftCollectionAddress);
  let provider = tonClient.provider(collection.address);

  const nftContent = profileToNftContent(
    normalizedLogin,
    normalizedImageUrl,
    normalizedFirstName,
    normalizedLastName,
    normalizedTgUsername
  );

  // ---- Create body for deploy transaction ----
  const body = ProfileCollectionV1.newItemMessage(nftContent, normalizedLogin);


  // ---- Send transaction ----
  const tx = await sendTransaction(
    tonConnectUI,
    collection.address.toString({
      urlSafe: true,
      bounceable: true,
      testOnly: false,
    }),
    toNano('0.05'),
    body
  );

  if (!tx.success)
    return { success: false, errors: tx.errors ?? [] };



  // ---- Derive NFT address from login ----
  const itemAddress = await collection.getNftAddressByIndex(provider, sha256n(normalizedLogin));

  // ---- Return normalized data ----
  return {
    success: true,
    data: {
      address: itemAddress.toString({urlSafe: true, bounceable: true, testOnly: false}),
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
  tgUsername?: string
): Promise<ProfileResult> {
  // ---- Validate input ----
  if (!wallet)
    return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };

  if (!login.trim())
    return { success: false, errors: [ErrorCode.INVALID_LOGIN] };


  // ---- Normalize all fields ----
  const normalizedLogin = toLower(login)!;
  const normalizedImageUrl =
    toLower(imageUrl) && toLower(imageUrl) !== ''
      ? toLower(imageUrl)
      : 'https://cryptostylematrix.github.io/frontend/cs-big.png';
  const normalizedFirstName = capitalize(firstName);
  const normalizedLastName = capitalize(lastName);
  const normalizedTgUsername = toLower(tgUsername);

  try {
    // ---- Fetch collection and item ----
    const collection = ProfileCollectionV1.createFromAddress(nftCollectionAddress);

    const provider = tonClient.provider(collection.address);
    const itemAddress = await collection.getNftAddressByIndex(
      provider,
      sha256n(normalizedLogin)
    );

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
      normalizedTgUsername
    );


    const body = ProfileItemV1.editContentMessage(nftContent);

    // ---- Send transaction ----
    const tx = await sendTransaction(
      tonConnectUI,
      itemAddress.toString({
        urlSafe: true,
        bounceable: true,
        testOnly: false,
      }),
      toNano('0.01'),
      body
    );


    if (!tx.success)
      return { success: false, errors: tx.errors ?? [] };

    // ---- Return normalized profile ----
    return {
      success: true,
      data: {
        address: itemAddress.toString({urlSafe: true, bounceable: true, testOnly: false}),
        wallet: wallet.trim(),
        login: normalizedLogin,
        imageUrl: normalizedImageUrl,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        tgUsername: normalizedTgUsername,
      },
    };

  } catch (err) {
    console.error('updateProfile error:', err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}


/**
 * Get an existing profile by wallet + login.
 */
export async function getProfile(
  wallet: string,
  login: string
): Promise<ProfileResult> {

  // ---- Basic validation ----
  if (!wallet) {
    return { success: false, errors: [ErrorCode.WALLET_NOT_CONNECTED] };
  }

  if (!login.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_LOGIN] };
  }


  try {
    const normalizedLogin = toLower(login)!;

    // ---- Initialize collection and provider ----
    const collection = ProfileCollectionV1.createFromAddress(nftCollectionAddress);
    let provider = tonClient.provider(collection.address);

    // ---- Derive NFT address from login ----
    const itemAddress = await collection.getNftAddressByIndex(provider, sha256n(normalizedLogin));

    if (!itemAddress) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    const item = ProfileItemV1.createFromAddress(itemAddress);
    provider = tonClient.provider(itemAddress);

    const dataCell = await item.getNftData(provider);


    // ---- Validate owner ----
    if (dataCell.owner?.toRawString() !== Address.parse(wallet).toRawString()) {
      return { success: false, errors: [ErrorCode.CONTRACT_DOES_NOT_BELONG] };
    }

    // ---- Parse content ----
    const data = dataCell.content!.asSlice();
    const start = data.loadUint(8);


    if (start !== 0) {
      throw new Error('Unknown on-chain content format');
    }

    const dict = data.loadDict(Dictionary.Keys.Buffer(32), NFTDictValueSerializer);


    // ---- Extract fields from dictionary ----
    const keys = ['image', 'name', 'description', 'attributes'];
    const result: Record<string, string | undefined> = {};

    for (const key of keys) {
      const dictKey = sha256_sync(key);
      const dictValue = dict.get(dictKey);
      if (dictValue) {
        // Each dictValue is a string (NFTDictValueSerializer handles decoding)
        result[key] = dictValue.content.toString('utf-8');
      }
    }

    // ---- Parse attributes JSON ----
    let firstName: string | undefined;
    let lastName: string | undefined;
    let tgUsername: string | undefined;

    if (result['attributes']) {
      try {
        const attrs = JSON.parse(result['attributes']);
        const getValue = (trait: string) =>
          attrs.find((a: any) => a.trait_type === trait)?.value;
        firstName = getValue('firstName');
        lastName = getValue('lastName');
        tgUsername = getValue('tgUsername');
      } catch {
        console.warn('Failed to parse attributes JSON');
      }
    }


    // ---- Normalize all fields ----
   
    const normalizedImageUrl =
      toLower(result['image']) && toLower(result['image']) !== ''
        ? toLower(result['image'])
        : 'https://cryptostylematrix.github.io/frontend/cs-big.png';
    const normalizedFirstName = capitalize(firstName);
    const normalizedLastName = capitalize(lastName);
    const normalizedTgUsername = toLower(tgUsername);

    // ---- Construct final profile ----
    const profile: ProfileData = {
      address: itemAddress.toString({urlSafe: true, bounceable: true, testOnly: false}),
      wallet: wallet.trim(),
      login: normalizedLogin,
      imageUrl: normalizedImageUrl,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      tgUsername: normalizedTgUsername,
    };


    return { success: true, data: profile };
  } catch (err) {
    console.error('getProfile error:', err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}

export async function getNftData(nftAddress: string): Promise<NftDataResult> {
  if (!nftAddress?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const address = Address.parse(nftAddress.trim());
    const item = ProfileItemV1.createFromAddress(address);
    const provider = tonClient.provider(address);
    const dataCell = await item.getNftData(provider);

    const contentSlice = dataCell.content?.asSlice();
    if (!contentSlice) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    const start = contentSlice.loadUint(8);
    if (start !== 0) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    const dict = contentSlice.loadDict(Dictionary.Keys.Buffer(32), NFTDictValueSerializer);

    const image = dict.get(sha256_sync("image"))?.content.toString("utf-8");
    const name = dict.get(sha256_sync("name"))?.content.toString("utf-8");
    const attributes = dict.get(sha256_sync("attributes"))?.content.toString("utf-8");

    let firstName: string | undefined;
    let lastName: string | undefined;
    let tgUsername: string | undefined;

    if (attributes) {
      try {
        const parsed = JSON.parse(attributes);
        const getValue = (trait: string) =>
          parsed.find((a: any) => a.trait_type === trait)?.value;

        firstName = getValue("firstName");
        lastName = getValue("lastName");
        tgUsername = getValue("tgUsername");
      } catch {
        console.warn("Failed to parse NFT attributes JSON");
      }
    }

    const normalizedImageUrl =
      toLower(image) && toLower(image) !== ""
        ? toLower(image)
        : "https://cryptostylematrix.github.io/frontend/cs-big.png";

    const normalizedLogin = toLower(name) || "unknown";
    const normalizedFirstName = capitalize(firstName);
    const normalizedLastName = capitalize(lastName);
    const normalizedTgUsername = toLower(tgUsername);

    return {
      success: true,
      data: {
        address: address.toString({ urlSafe: true, bounceable: true, testOnly: false }),
        login: normalizedLogin,
        imageUrl: normalizedImageUrl!,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        tgUsername: normalizedTgUsername,
      },
    };
  } catch (err) {
    console.error("getNftData error:", err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}

export async function getProfileDataByAddress(profileAddress: string): Promise<ProfilePreviewResult> {
  if (!profileAddress?.trim()) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const address = Address.parse(profileAddress.trim());
    const item = ProfileItemV1.createFromAddress(address);
    const provider = tonClient.provider(address);
    const dataCell = await item.getNftData(provider);

    const contentSlice = dataCell.content?.asSlice();
    if (!contentSlice) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    const start = contentSlice.loadUint(8);
    if (start !== 0) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    const dict = contentSlice.loadDict(Dictionary.Keys.Buffer(32), NFTDictValueSerializer);

    const image = dict.get(sha256_sync("image"))?.content.toString("utf-8");
    const name = dict.get(sha256_sync("name"))?.content.toString("utf-8");

    return {
      success: true,
      data: {
        login: name || "unknown",
        imageUrl: image || "https://cryptostylematrix.github.io/frontend/cs-big.png",
      },
    };
  } catch (err) {
    console.error("getProfileDataByAddress error:", err);
    return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
  }
}


/**
 * Get wallet balance.
 */
export async function getBalance(walletAddress: string): Promise<BalanceResult> {
  // ---- Validate input ----
  if (!walletAddress || walletAddress.trim().length < 10) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    // ---- Parse and fetch balance ----
    const address = Address.parse(walletAddress.trim());
    const nanoValueStr = await tonClient.getBalance(address);

    // ---- Convert to bigint safely ----
    const nanoValueBigInt = BigInt(nanoValueStr);

    return { success: true, balance: nanoValueBigInt };
  } catch (error) {
    console.error('Error fetching TON balance:', error);
    return { success: false, errors: [ErrorCode.BALANCE_FETCH_FAILED] };
  }
}

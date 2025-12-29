// src/services/profileService.ts
import { ErrorCode } from "../errors/ErrorCodes";
import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, Cell, Dictionary, beginCell, toNano } from "@ton/core";
import { sha256_sync } from "@ton/crypto";
import { getCollectionData, getNftAddrByLogin } from "./contractsApi";
import { sendTransaction } from "./tonConnectService";

type NftContentOnchain = {
  type: "onchain";
  data: {
    name: string;
    description: string;
    image: string;
    attributes?: string;
  };
};

const NFTDictValueSerializer = {
  serialize: (src: { content: Buffer }, builder: any) => {
    builder.storeRef(beginCell().storeBuffer(src.content).endCell());
  },
  parse: (src: any): { content: Buffer } => {
    const ref = src.loadRef();
    return { content: ref.beginParse().loadBuffer(ref.remaining) };
  },
};

const nftContentToCell = (content: NftContentOnchain): Cell => {
  const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), NFTDictValueSerializer);
  Object.entries(content.data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const bufferVal = Buffer.from(String(value), "utf-8");
    dict.set(sha256_sync(key), { content: bufferVal });
  });
  return beginCell().storeUint(0, 8).storeDict(dict).endCell();
};

const buildDeployItemBody = (content: Cell, login: string, queryId: number | bigint = 0): Cell =>
  beginCell()
    .storeUint(1, 32) // COLLECTION_DEPLOY_ITEM
    .storeUint(queryId, 64)
    .storeStringTail(login)
    .storeRef(content)
    .endCell();

const buildEditContentBody = (content: Cell, queryId: number | bigint = 0): Cell =>
  beginCell().storeUint(0x1a0b9d51, 32).storeUint(queryId, 64).storeRef(content).endCell();

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

const normalizeImage = (value?: string | null): string => {
  const lower = value?.trim().toLowerCase();
  return lower && lower !== "" ? lower : "https://cryptostylematrix.github.io/frontend/cs-big.png";
};

const capitalize = (str?: string | null): string | undefined => {
  if (!str?.trim()) return undefined;
  const t = str.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

const toLower = (str?: string | null): string | undefined => {
  return str?.trim() ? str.trim().toLowerCase() : undefined;
};

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

type PackedProfile = {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string | undefined }[];
};

function packProfile(
  login: string,
  imageUrl?: string,
  firstName?: string,
  lastName?: string,
  tgUsername?: string,
): PackedProfile {
  const formattedLogin = toLower(login)!;
  const formattedImageUrl = normalizeImage(imageUrl);
  const formattedFirstName = capitalize(firstName);
  const formattedLastName = capitalize(lastName);
  const formattedTgUsername = toLower(tgUsername);

  return {
    name: formattedLogin,
    description: "Crypto Style Profile",
    image: formattedImageUrl,
    attributes: [
      { trait_type: "firstName", value: formattedFirstName },
      { trait_type: "lastName", value: formattedLastName },
      { trait_type: "tgUsername", value: formattedTgUsername },
    ],
  };
}

// -------------------- PROFILE TO CELL --------------------

export function profileToNftContent(
  login: string,
  imageUrl?: string,
  firstName?: string,
  lastName?: string,
  tgUsername?: string,
): NftContentOnchain {
  const profile = packProfile(login, imageUrl, firstName, lastName, tgUsername);

  const onchain: NftContentOnchain = {
    type: "onchain",
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

  // ---- Prepare NFT content ----
  const nftContent = profileToNftContent(
    normalizedLogin,
    normalizedImageUrl,
    normalizedFirstName,
    normalizedLastName,
    normalizedTgUsername,
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

/**
 * Get an existing profile by wallet + login.
 */

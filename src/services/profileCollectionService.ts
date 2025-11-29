import { Address } from "@ton/core";
import { TonClient } from "@ton/ton";
import { ProfileCollectionV1 } from "../contracts/ProfileCollectionV1";
import { sha256n } from "../utils/cryptoHelper";
import { ErrorCode } from "../errors/ErrorCodes";

const tonClient = new TonClient({
  endpoint: "https://toncenter.com/api/v2/jsonRPC",
  apiKey: "193210c5feca89e2e483c94b7e7e43797c5c3e33cd61c7e711d4868dd8a4ed04", // optional
});

const nftCollectionAddress = Address.parse("EQAiWZqRPp39Z46Y4Pahvj5UQSzafJrUiTbYDcQ0kldLebjn");

export type ProfileAddressResult =
  | { success: true; address: string }
  | { success: false; errors: ErrorCode[] };

export async function getProfileAddressByLogin(login: string): Promise<ProfileAddressResult> {
  const normalizedLogin = login?.trim().toLowerCase();
  if (!normalizedLogin) {
    return { success: false, errors: [ErrorCode.INVALID_LOGIN] };
  }

  try {
    const collection = ProfileCollectionV1.createFromAddress(nftCollectionAddress);
    const provider = tonClient.provider(collection.address);
    const itemAddress = await collection.getNftAddressByIndex(provider, sha256n(normalizedLogin));
    if (!itemAddress) {
      return { success: false, errors: [ErrorCode.PROFILE_NOT_FOUND] };
    }

    return {
      success: true,
      address: itemAddress.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    };
  } catch (err) {
    console.error("getProfileAddressByLogin error:", err);
    return { success: false, errors: [ErrorCode.UNEXPECTED] };
  }
}

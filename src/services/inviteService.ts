import { Address } from "@ton/core";
import { MultiInvite } from "../contracts/MultiInvite";
import type { MultiInviteData } from "../contracts/MultiInvite";
import { ErrorCode } from "../errors/ErrorCodes";
import { TonClient } from "@ton/ton";
import { appConfig } from "../config";

const tonClient = new TonClient({
  endpoint: appConfig.ton.endpoint,
  apiKey: appConfig.ton.apiKey,
});

export type InviteResult =
  | { success: true }
  | { success: false; errors: ErrorCode[] };

export type InviteDataResult =
  | { success: true; data: MultiInviteData }
  | { success: false; errors: ErrorCode[] };

export type InviteAddressResult =
  | { success: true; address: string }
  | { success: false; errors: ErrorCode[] };

export async function getInviteData(invite_addr: string): Promise<InviteDataResult> {
  const address = invite_addr?.trim();
  if (!address) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }

  try {
    const contract = MultiInvite.createFromAddress(Address.parse(address));
    const provider = tonClient.provider(contract.address);


    console.log('loading invite data of  ', address)

    const data = await contract.getInviteData(provider);
    return { success: true, data };
  } catch (err) {
    console.error("getInviteData error:", err);
    return { success: false, errors: [ErrorCode.UNEXPECTED] };
  }
}

export async function getInviteAddressBySeqNo(invite_addr: string, seqNo: number): Promise<InviteAddressResult> {
  const address = invite_addr?.trim();
  if (!address) {
    return { success: false, errors: [ErrorCode.INVALID_WALLET_ADDRESS] };
  }
  try {
    const contract = MultiInvite.createFromAddress(Address.parse(address));
    const provider = tonClient.provider(contract.address);
    const result = await contract.getInviteAddressBySeqNo(provider, seqNo);
    return {
      success: true,
      address: result.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    };
  } catch (err) {
    console.error("getInviteAddressBySeqNo error:", err);
    return { success: false, errors: [ErrorCode.UNEXPECTED] };
  }
}

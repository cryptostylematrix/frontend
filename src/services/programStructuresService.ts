import type { TonConnectUI } from "@tonconnect/ui-react";
import { Address, beginCell, Cell, toNano } from "@ton/core";
import { UserCommandTag } from "../contracts/schemes/UserCommand";
import { ErrorCode } from "../errors/ErrorCodes";
import {
  buildJettonTransferMsgBody,
  buildMarketingV3ExecMessageBody,
  getJettonWalletAddress,
  getJettonWalletData,
  getMarketingV3Data,
  type MarketingV3CommandConfigResponse,
} from "./contractsApi";
import type { ProgramPlace } from "./programApi";
import { getPurchaseOption } from "./programApi";
import { sendTransaction } from "./tonConnectService";

export type PlacePosData = {
  parent: Pick<ProgramPlace, "struct" | "profile_addr" | "place_number">;
  pos: number;
};

export type ProgramContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

export type BuyCommand = {
  tag:
    | typeof UserCommandTag.buyFirstPlace
    | typeof UserCommandTag.buyPlace
    | typeof UserCommandTag.buyTopPlace;
  config: MarketingV3CommandConfigResponse;
  position: PlacePosData | null;
};

const toBigInt = (value: number | string | bigint) =>
  typeof value === "bigint" ? value : BigInt(value);

const hasSufficientJettonBalance = async (
  walletAddress: string,
  requiredAmount: number | string | bigint,
) => {
  const walletData = await getJettonWalletData(walletAddress);
  return (
    walletData !== null &&
    toBigInt(walletData.balance) >= toBigInt(requiredAmount)
  );
};

const createQueryId = (): bigint => {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return (BigInt(Date.now()) << 20n) | BigInt(random[0] & 0xfffff);
};

const positionPayload = (position: PlacePosData | null): Cell | null => {
  if (!position) return null;

  return beginCell()
    .storeUint(position.parent.struct, 8)
    .storeAddress(
      position.parent.profile_addr
        ? Address.parse(position.parent.profile_addr)
        : null,
    )
    .storeUint(position.parent.place_number, 32)
    .storeUint(position.pos, 32)
    .endCell();
};

async function getBuyCommand(
  marketingAddress: string,
  structure: number,
  profileAddress: string,
  position: PlacePosData | null,
): Promise<BuyCommand | null> {
  const [marketingData, option] = await Promise.all([
    getMarketingV3Data(marketingAddress),
    getPurchaseOption(
      marketingAddress,
      structure,
      profileAddress,
      position
        ? {
            parentProfileAddress: position.parent.profile_addr,
            parentPlaceNumber: position.parent.place_number,
            position: position.pos,
          }
        : null,
    ),
  ]);
  const commands = marketingData?.structures[String(structure)]?.commands ?? {};
  if (!option?.can_buy || option.command_tag === null || !option.position) {
    return null;
  }

  const config = commands[String(option.command_tag)];
  if (!config) return null;

  return {
    tag: option.command_tag as BuyCommand["tag"],
    config,
    position: option.include_position
      ? {
          parent: {
            struct: structure,
            profile_addr: option.position.profile_addr,
            place_number: option.position.place_number,
          },
          pos: option.position.pos,
        }
      : null,
  };
}

async function buildExecBody(
  structure: number,
  profileAddress: string,
  commandTag: number,
  position: PlacePosData | null,
) {
  const payload = positionPayload(position);
  return buildMarketingV3ExecMessageBody({
    queryId: createQueryId(),
    structure,
    profileAddr: profileAddress,
    commandTag,
    payloadBocHex: payload?.toBoc().toString("hex"),
  });
}

export async function executePositionCommand(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  structure: number,
  profileAddr: string,
  senderAddr: string,
  commandTag:
    | typeof UserCommandTag.lockPos
    | typeof UserCommandTag.unlockPos,
  position: PlacePosData,
): Promise<ProgramContractResult> {
  const marketingAddress = marketingAddr.trim();
  const profileAddress = profileAddr.trim();
  const senderAddress = senderAddr.trim();
  if (
    !marketingAddress ||
    !profileAddress ||
    !senderAddress ||
    !Number.isInteger(structure)
  ) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  try {
    const marketingData = await getMarketingV3Data(marketingAddress);
    const command =
      marketingData?.structures[String(structure)]?.commands[
        String(commandTag)
      ];
    if (!command) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const execBody = await buildExecBody(
      structure,
      profileAddress,
      commandTag,
      position,
    );
    if (!execBody?.boc_hex) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const marketingJettonWallet = command.sender_jetton_wallet?.trim();
    if (!marketingJettonWallet) {
      const result = await sendTransaction(
        tonConnectUI,
        marketingAddress,
        toBigInt(command.price) + toBigInt(command.gram_fee),
        Cell.fromHex(execBody.boc_hex),
      );
      return result.success
        ? { success: true }
        : {
            success: false,
            error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED,
          };
    }

    const jettonData = await getJettonWalletData(marketingJettonWallet);
    const minterAddress = jettonData?.minter_addr?.trim();
    if (!minterAddress) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const senderJettonWallet = await getJettonWalletAddress(
      minterAddress,
      senderAddress,
    );
    if (!senderJettonWallet?.wallet_addr) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    if (
      !(await hasSufficientJettonBalance(
        senderJettonWallet.wallet_addr,
        command.price,
      ))
    ) {
      return { success: false, error_code: ErrorCode.INSUFFICIENT_FUNDS };
    }

    const transferBody = await buildJettonTransferMsgBody({
      queryId: createQueryId(),
      amount: command.price,
      destinationAddr: marketingAddress,
      responseDestinationAddr: senderAddress,
      forwardTonAmount: command.gram_fee,
      forwardPayloadBocHex: execBody.boc_hex,
    });
    if (!transferBody?.boc_hex) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const result = await sendTransaction(
      tonConnectUI,
      senderJettonWallet.wallet_addr,
      toBigInt(command.gram_fee) + toNano("0.05"),
      Cell.fromHex(transferBody.boc_hex),
    );
    return result.success
      ? { success: true }
      : {
          success: false,
          error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED,
        };
  } catch (error) {
    console.error("Program position command error", error);
    return { success: false, error_code: ErrorCode.UNEXPECTED };
  }
}

export async function buyPlaceByTon(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  structure: number,
  profileAddr: string,
  pos: PlacePosData | null,
): Promise<ProgramContractResult> {
  const marketingAddress = marketingAddr.trim();
  const profileAddress = profileAddr.trim();
  if (!marketingAddress || !profileAddress || !Number.isInteger(structure)) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  try {
    const command = await getBuyCommand(
      marketingAddress,
      structure,
      profileAddress,
      pos,
    );
    if (!command || command.config.sender_jetton_wallet) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const body = await buildExecBody(
      structure,
      profileAddress,
      command.tag,
      command.position,
    );
    if (!body?.boc_hex) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const result = await sendTransaction(
      tonConnectUI,
      marketingAddress,
      toBigInt(command.config.price) + toBigInt(command.config.gram_fee),
      Cell.fromHex(body.boc_hex),
    );
    return result.success
      ? { success: true }
      : {
          success: false,
          error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED,
        };
  } catch (error) {
    console.error("Program TON purchase error", error);
    return { success: false, error_code: ErrorCode.UNEXPECTED };
  }
}

export async function buyPlaceByJetton(
  tonConnectUI: TonConnectUI,
  marketingAddr: string,
  structure: number,
  profileAddr: string,
  senderAddr: string,
  pos: PlacePosData | null,
): Promise<ProgramContractResult> {
  const marketingAddress = marketingAddr.trim();
  const profileAddress = profileAddr.trim();
  const senderAddress = senderAddr.trim();
  if (
    !marketingAddress ||
    !profileAddress ||
    !senderAddress ||
    !Number.isInteger(structure)
  ) {
    return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
  }

  try {
    const command = await getBuyCommand(
      marketingAddress,
      structure,
      profileAddress,
      pos,
    );
    const marketingJettonWallet = command?.config.sender_jetton_wallet?.trim();
    if (!command || !marketingJettonWallet) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const execBody = await buildExecBody(
      structure,
      profileAddress,
      command.tag,
      command.position,
    );
    if (!execBody?.boc_hex) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const jettonData = await getJettonWalletData(marketingJettonWallet);
    const minterAddress = jettonData?.minter_addr?.trim();
    if (!minterAddress) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const senderJettonWallet = await getJettonWalletAddress(
      minterAddress,
      senderAddress,
    );
    if (!senderJettonWallet?.wallet_addr) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    if (
      !(await hasSufficientJettonBalance(
        senderJettonWallet.wallet_addr,
        command.config.price,
      ))
    ) {
      return { success: false, error_code: ErrorCode.INSUFFICIENT_FUNDS };
    }

    const transferBody = await buildJettonTransferMsgBody({
      queryId: createQueryId(),
      amount: command.config.price,
      destinationAddr: marketingAddress,
      responseDestinationAddr: senderAddress,
      forwardTonAmount: command.config.gram_fee,
      forwardPayloadBocHex: execBody.boc_hex,
    });
    if (!transferBody?.boc_hex) {
      return { success: false, error_code: ErrorCode.INVALID_PAYLOAD };
    }

    const result = await sendTransaction(
      tonConnectUI,
      senderJettonWallet.wallet_addr,
      toBigInt(command.config.gram_fee) + toNano("0.05"),
      Cell.fromHex(transferBody.boc_hex),
    );
    return result.success
      ? { success: true }
      : {
          success: false,
          error_code: result.errors?.[0] ?? ErrorCode.TRANSACTION_FAILED,
        };
  } catch (error) {
    console.error("Program Jetton purchase error", error);
    return { success: false, error_code: ErrorCode.UNEXPECTED };
  }
}

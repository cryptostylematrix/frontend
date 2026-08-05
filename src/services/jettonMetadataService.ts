import {
  getJettonMinterData,
  getJettonWalletData,
} from "./contractsApi";

const DEFAULT_DECIMALS = 9;

export type JettonMetadata = {
  decimals: number;
  symbol: string;
};

type JettonMetadataJson = {
  decimals?: unknown;
  digits?: unknown;
  symbol?: unknown;
};

const metadataCache = new Map<string, Promise<JettonMetadata | null>>();

const metadataUrl = (uri: string) =>
  uri.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`
    : uri;

const loadJsonMetadata = async (uri: string): Promise<JettonMetadataJson> => {
  const response = await fetch(metadataUrl(uri));
  if (!response.ok) {
    throw new Error(`Jetton metadata request failed with ${response.status}`);
  }
  return (await response.json()) as JettonMetadataJson;
};

const parseDecimals = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255
    ? parsed
    : DEFAULT_DECIMALS;
};

const normalizeMetadata = (metadata: JettonMetadataJson): JettonMetadata => ({
  decimals: parseDecimals(metadata.decimals ?? metadata.digits),
  symbol:
    typeof metadata.symbol === "string" && metadata.symbol.trim()
      ? metadata.symbol.trim()
      : "JETTON",
});

const loadJettonMetadata = async (
  jettonWalletAddress: string,
): Promise<JettonMetadata | null> => {
  try {
    const walletData = await getJettonWalletData(jettonWalletAddress);
    const minterAddress = walletData?.minter_addr?.trim();
    if (!minterAddress) return null;

    const minterData = await getJettonMinterData(minterAddress);
    if (!minterData) return null;

    const metadataUri = minterData.metadata_uri?.trim();
    let externalMetadata: JettonMetadataJson = {};
    if (metadataUri) {
      try {
        externalMetadata = await loadJsonMetadata(metadataUri);
      } catch (error) {
        console.error("Failed to load Jetton metadata JSON", error);
      }
    }

    return normalizeMetadata({
      ...externalMetadata,
      decimals: minterData.decimals ?? externalMetadata.decimals,
    });
  } catch (error) {
    console.error("Failed to load Jetton metadata", error);
    return null;
  }
};

export function getJettonMetadata(
  jettonWalletAddress: string,
): Promise<JettonMetadata | null> {
  const normalizedAddress = jettonWalletAddress.trim();
  if (!normalizedAddress) return Promise.resolve(null);

  const cached = metadataCache.get(normalizedAddress);
  if (cached) return cached;

  const request = loadJettonMetadata(normalizedAddress).then((metadata) => {
    if (!metadata) metadataCache.delete(normalizedAddress);
    return metadata;
  });
  metadataCache.set(normalizedAddress, request);
  return request;
}

export function formatJettonAmount(
  amount: number | string | bigint,
  decimals: number,
) {
  const value = BigInt(amount);
  if (decimals === 0) return value.toString();

  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

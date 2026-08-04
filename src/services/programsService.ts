import { Address, Cell } from "@ton/core";
import { appConfig } from "../config";
import { SeriesItemBase } from "../contracts/SeriesItemBase";
import { SeriesTag } from "../contracts/schemes/Series";
import { getMarketingV3BasicData } from "./contractsApi";

type ProgramMetadata = {
  name?: unknown;
};

export type Program = {
  address: string;
  index: number;
  name: string;
};

const metadataUrl = (uri: string) => {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }

  return new URL(uri, window.location.href).toString();
};

const loadProgram = async (
  adminAddress: Address,
  code: Cell,
  index: number,
): Promise<Program | null> => {
  const contract = SeriesItemBase.createFromConfig(
    {
      adminAddress,
      index,
      series: { tag: SeriesTag.marketing },
    },
    code,
  );

  try {
    const basicData = await getMarketingV3BasicData(contract.address.toString());
    if (basicData?.init !== -1 || !basicData.metadata_uri) return null;

    const uri = basicData.metadata_uri.trim();
    if (!uri) return null;

    const response = await fetch(metadataUrl(uri));
    if (!response.ok) return null;

    const metadata = (await response.json()) as ProgramMetadata;
    if (typeof metadata.name !== "string" || !metadata.name.trim()) return null;

    return {
      address: contract.address.toString(),
      index,
      name: metadata.name.trim(),
    };
  } catch (error) {
    console.error(
      `Failed to load marketing program ${index} at ${contract.address.toString()}`,
      error,
    );
    return null;
  }
};

export async function loadPrograms(admin: string): Promise<Program[]> {
  const normalizedAdmin = admin.trim();
  if (!normalizedAdmin) return [];

  try {
    const adminAddress = Address.parse(normalizedAdmin);
    const code = Cell.fromHex(appConfig.ton.seriesItemBaseCodeHex);
    const depth = Math.max(0, appConfig.ton.series.marketing.depth);
    const programs: Program[] = [];

    for (let index = 1; index <= depth; index += 1) {
      const program = await loadProgram(adminAddress, code, index);
      if (program) programs.push(program);
    }

    return programs;
  } catch (error) {
    console.error("Failed to initialize marketing programs", error);
    return [];
  }
}

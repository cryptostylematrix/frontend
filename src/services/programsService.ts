import { Address, Cell } from "@ton/core";
import { appConfig } from "../config";
import { SeriesItemBase } from "../contracts/SeriesItemBase";
import { SeriesTag } from "../contracts/schemes/Series";
import { getMarketingV3BasicData } from "./contractsApi";

type ProgramMetadata = {
  name?: unknown;
  image?: unknown;
  creator?: { tg?: unknown } | null;
  features?: unknown;
  platforms?: unknown;
  entry?: {
    price?: unknown;
    currency?: unknown;
  } | null;
  incomes?: unknown;
  presentations?: {
    pdf?: unknown;
    video?: unknown;
  } | null;
};

export type ProgramPrice = {
  value: number;
  currency: string;
};

export type ProgramIncome = ProgramPrice & {
  period: string;
};

export type ProgramPresentationLinks = Record<string, string>;

export type Program = {
  address: string;
  index: number;
  name: string;
  image: string | null;
  creatorTg: string | null;
  features: string[];
  platforms: number | null;
  entry: ProgramPrice | null;
  incomes: ProgramIncome[];
  presentations: {
    pdf: ProgramPresentationLinks;
    video: ProgramPresentationLinks;
  };
};

const programCache = new Map<string, Promise<Program | null>>();

const metadataUrl = (uri: string) => {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }

  return new URL(uri, window.location.href).toString();
};

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const optionalNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parsePrice = (
  value: ProgramMetadata["entry"],
): ProgramPrice | null => {
  const price = optionalNumber(value?.price);
  const currency = optionalString(value?.currency);
  return price === null || !currency ? null : { value: price, currency };
};

const parseIncomes = (value: unknown): ProgramIncome[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const income = item as Record<string, unknown>;
    const amount = optionalNumber(income.value);
    const currency = optionalString(income.currency);
    const period = optionalString(income.period ?? income.preiod);
    return amount === null || !currency || !period
      ? []
      : [{ value: amount, currency, period }];
  });
};

const parsePresentationLinks = (
  value: unknown,
): ProgramPresentationLinks => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce(
    (links, [language, link]) => {
      const normalizedLanguage = language.trim().toLowerCase().split("-")[0];
      const normalizedLink = optionalString(link);
      if (normalizedLanguage && normalizedLink) {
        links[normalizedLanguage] = normalizedLink;
      }
      return links;
    },
    {} as ProgramPresentationLinks,
  );
};

const resolveImageUrl = (value: unknown, metadataUri: string) => {
  const image = optionalString(value);
  if (!image) return null;
  if (image.startsWith("ipfs://")) return metadataUrl(image);

  try {
    return new URL(image, metadataUrl(metadataUri)).toString();
  } catch {
    return null;
  }
};

const fetchProgram = async (address: string): Promise<Program | null> => {
  try {
    const basicData = await getMarketingV3BasicData(address);
    if (basicData?.init !== -1 || !basicData.metadata_uri) return null;

    const uri = basicData.metadata_uri.trim();
    if (!uri) return null;

    const response = await fetch(metadataUrl(uri));
    if (!response.ok) return null;

    const metadata = (await response.json()) as ProgramMetadata;
    if (typeof metadata.name !== "string" || !metadata.name.trim()) return null;

    const creatorTg = optionalString(metadata.creator?.tg)?.replace(/^@/, "") ?? null;
    const platforms = optionalNumber(metadata.platforms);

    return {
      address,
      index: basicData.index,
      name: metadata.name.trim(),
      image: resolveImageUrl(metadata.image, uri),
      creatorTg,
      features: Array.isArray(metadata.features)
        ? metadata.features.flatMap((feature) => {
            const normalized = optionalString(feature);
            return normalized ? [normalized] : [];
          })
        : [],
      platforms:
        platforms !== null && Number.isInteger(platforms) ? platforms : null,
      entry: parsePrice(metadata.entry),
      incomes: parseIncomes(metadata.incomes),
      presentations: {
        pdf: parsePresentationLinks(metadata.presentations?.pdf),
        video: parsePresentationLinks(metadata.presentations?.video),
      },
    };
  } catch (error) {
    console.error(
      `Failed to load marketing program at ${address}`,
      error,
    );
    return null;
  }
};

export function loadProgramMetadata(address: string): Promise<Program | null> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress) return Promise.resolve(null);

  const cached = programCache.get(normalizedAddress);
  if (cached) return cached;

  const request = fetchProgram(normalizedAddress).then((program) => {
    if (!program) programCache.delete(normalizedAddress);
    return program;
  });
  programCache.set(normalizedAddress, request);
  return request;
}

export async function loadPrograms(admin: string): Promise<Program[]> {
  const normalizedAdmin = admin.trim();
  if (!normalizedAdmin) return [];

  try {
    const adminAddress = Address.parse(normalizedAdmin);
    const code = Cell.fromHex(appConfig.ton.seriesItemBaseCodeHex);
    const depth = Math.max(0, appConfig.ton.series.marketing.depth);
    const programs: Program[] = [];

    for (let index = 1; index <= depth; index += 1) {
      const contract = SeriesItemBase.createFromConfig(
        {
          adminAddress,
          index,
          series: { tag: SeriesTag.marketing },
        },
        code,
      );
      const program = await loadProgramMetadata(contract.address.toString());
      if (program) programs.push(program);
    }

    return programs;
  } catch (error) {
    console.error("Failed to initialize marketing programs", error);
    return [];
  }
}

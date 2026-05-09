import { appConfig } from "../config";

export type MarketingPaginated<T> = {
  items: T[];
  page: number;
  total_pages: number;
};

export type MarketingLock = {
  marketing_addr: string;
  m: number;
  profile_addr: string;
  place_addr: string;
  locked_pos: number;
  place_profile_login: string;
  place_number: number;
  created_at: number;
};

export type MarketingNextPos = {
  parent_addr: string;
  pos: number;
};

export type MarketingPlace = {
  marketing_addr: string;
  m: number;
  parent_addr: string | null;
  pos: number;
  seq_no: number;
  width: number;
  height: number;
  kind: number;
  profile_addr: string;
  place_number: number;
  addr: string;
  created_at: number;
  login: string;
};

export type MarketingTreeBaseNode = {
  locked: boolean;
  can_lock: boolean;
  is_lock: boolean;
  parent_addr: string | null;
  pos: number;
  seq_no: number;
  width: number;
  height: number;
  children: MarketingTreeNode[] | null;
};

export type MarketingTreeEmptyNode = MarketingTreeBaseNode & {
  kind: "empty";
  is_next_pos: boolean;
  can_buy: boolean;
};

export type MarketingTreeFilledNode = MarketingTreeBaseNode & {
  kind: "filled" | number;
  addr: string;
  place_number: number;
  created_at: number;
  profile_login: string;
  profile_addr: string;
  descendants: number;
  is_root: boolean;
};

export type MarketingTreeNode = MarketingTreeEmptyNode | MarketingTreeFilledNode;

export interface MarketingApi {
  getRootPlace: (marketingAddr: string, m: number, profileAddr: string) => Promise<MarketingPlace | null>;
  getNextPos: (marketingAddr: string, m: number, profileAddr: string) => Promise<MarketingNextPos | null>;
  getPath: (marketingAddr: string, rootAddr: string, placeAddr: string) => Promise<MarketingPlace[] | null>;
  fetchPlaces: (
    marketingAddr: string,
    m: number,
    profileAddr: string,
    page?: number,
    pageSize?: number
  ) => Promise<MarketingPaginated<MarketingPlace>>;
  getPlacesCount: (marketingAddr: string, m: number, profileAddr: string) => Promise<number>;
  getTotalPlaceCount: (marketingAddr: string, profileAddr: string) => Promise<number>;
  fetchLocks: (
    marketingAddr: string,
    m: number,
    profileAddr: string,
    page?: number,
    pageSize?: number
  ) => Promise<MarketingPaginated<MarketingLock>>;
  searchPlaces: (
    marketingAddr: string,
    m: number,
    profileAddr: string,
    query: string,
    page?: number,
    pageSize?: number
  ) => Promise<MarketingPaginated<MarketingPlace>>;
  getTree: (
    marketingAddr: string,
    profileAddr: string,
    placeAddr: string,
    fromPos?: number,
    toPos?: number
  ) => Promise<MarketingTreeNode | null>;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizedBase = (() => {
  const raw = appConfig.marketingApi.host || "";
  if (!raw) return "";
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  return trimTrailingSlash(withProtocol);
})();

const defaultOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

const buildUrl = (path: string, query?: Record<string, string | number | undefined>) => {
  const url = new URL(path, normalizedBase || defaultOrigin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const encodePathPart = (value: string | number) => encodeURIComponent(String(value));

const emptyPlacesPage: MarketingPaginated<MarketingPlace> = { items: [], page: 1, total_pages: 1 };
const emptyLocksPage: MarketingPaginated<MarketingLock> = { items: [], page: 1, total_pages: 1 };

const safeGet = async <T>(path: string, query?: Record<string, string | number | undefined>): Promise<T | null> => {
  try {
    const res = await fetch(buildUrl(path, query));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error("marketingApi request error:", err);
    return null;
  }
};

export async function getRootPlace(marketingAddr: string, m: number, profileAddr: string): Promise<MarketingPlace | null> {
  return safeGet<MarketingPlace>(
    `/api/marketing/${encodePathPart(marketingAddr)}/root`,
    { m, profile_addr: profileAddr }
  );
}

export async function getNextPos(marketingAddr: string, m: number, profileAddr: string): Promise<MarketingNextPos | null> {
  return safeGet<MarketingNextPos>(
    `/api/marketing/${encodePathPart(marketingAddr)}/next-pos`,
    { m, profile_addr: profileAddr }
  );
}

export async function getPath(marketingAddr: string, rootAddr: string, placeAddr: string): Promise<MarketingPlace[] | null> {
  return safeGet<MarketingPlace[]>(`/api/marketing/${encodePathPart(marketingAddr)}/path`, {
    root_addr: rootAddr,
    place_addr: placeAddr,
  });
}

export async function fetchPlaces(
  marketingAddr: string,
  m: number,
  profileAddr: string,
  page = 1,
  pageSize = 50
): Promise<MarketingPaginated<MarketingPlace>> {
  const result = await safeGet<MarketingPaginated<MarketingPlace>>(
    `/api/marketing/${encodePathPart(marketingAddr)}/places`,
    { m, profile_addr: profileAddr, page, page_size: pageSize }
  );
  return result ?? emptyPlacesPage;
}

export async function getPlacesCount(marketingAddr: string, m: number, profileAddr: string): Promise<number> {
  const result = await safeGet<{ count: number }>(
    `/api/marketing/${encodePathPart(marketingAddr)}/places/count`,
    { m, profile_addr: profileAddr }
  );
  return result?.count ?? 0;
}

export async function getTotalPlaceCount(marketingAddr: string, profileAddr: string): Promise<number> {
  const result = await safeGet<{ total_count: number }>(
    `/api/marketing/${encodePathPart(marketingAddr)}/places/total-count`,
    { profile_addr: profileAddr }
  );
  return result?.total_count ?? 0;
}

export async function fetchLocks(
  marketingAddr: string,
  m: number,
  profileAddr: string,
  page = 1,
  pageSize = 50
): Promise<MarketingPaginated<MarketingLock>> {
  const result = await safeGet<MarketingPaginated<MarketingLock>>(
    `/api/marketing/${encodePathPart(marketingAddr)}/locks`,
    { m, profile_addr: profileAddr, page, page_size: pageSize }
  );
  return result ?? emptyLocksPage;
}

export async function searchPlaces(
  marketingAddr: string,
  m: number,
  profileAddr: string,
  query: string,
  page = 1,
  pageSize = 50
): Promise<MarketingPaginated<MarketingPlace>> {
  const result = await safeGet<MarketingPaginated<MarketingPlace>>(
    `/api/marketing/${encodePathPart(marketingAddr)}/search`,
    { m, profile_addr: profileAddr, query, page, page_size: pageSize }
  );
  return result ?? emptyPlacesPage;
}

export async function getTree(
  marketingAddr: string,
  profileAddr: string,
  placeAddr: string,
  fromPos?: number,
  toPos?: number
): Promise<MarketingTreeNode | null> {
  return safeGet<MarketingTreeNode>(
    `/api/marketing/${encodePathPart(marketingAddr)}/tree`,
    { profile_addr: profileAddr, place_addr: placeAddr, from_pos: fromPos, to_pos: toPos }
  );
}

export const marketingApi: MarketingApi = {
  getRootPlace,
  getNextPos,
  getPath,
  fetchPlaces,
  getPlacesCount,
  getTotalPlaceCount,
  fetchLocks,
  searchPlaces,
  getTree,
};

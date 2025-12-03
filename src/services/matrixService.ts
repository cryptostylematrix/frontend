import { ErrorCode } from "../errors/ErrorCodes";
import { appConfig } from "../config";

export type MatrixPlace = {
  address: string;
  parent_address: string | null;
  place_number: number;
  created_at: number;
  fill_count: number;
  clone: number; // 1 means clone
  login: string;
  index: string;
};

export type PaginatedPlaces = {
  items: MatrixPlace[];
  page: number;
  totalPages: number;
};

export type TreeFilledNode = {
  kind: "filled";
  locked: boolean;
  address: string;
  parent_address: string;
  descendants: number;
  place_number: number;
  clone: number;
  created_at: number;
  login: string;
  image_url: string;
  children?: [TreeNode | undefined, TreeNode | undefined];
  can_be_locked: boolean;
  is_root: boolean;
  is_lock: boolean;
};

export type TreeEmptyNode = {
  kind: "empty";
  is_next_pos: boolean;
};

export type TreeNode = TreeFilledNode | TreeEmptyNode;

export type BuyPlaceResult =
  | { success: true }
  | { success: false; errors: ErrorCode[] };

export interface MatrixService {
  getRootPlace: (m: number, profile_addr: string) => Promise<MatrixPlace | null>;
  getNextPos: (m: number, profile_addr: string) => Promise<MatrixPlace | null>;
  getPath: (root_addr: string, place_addr: string) => Promise<MatrixPlace[] | null>;
  fetchPlaces: (m: number, profile_addr: string, page?: number, pageSize?: number) => Promise<PaginatedPlaces>;
  getPlacesCount: (m: number, profile_addr: string) => Promise<number>;
  fetchLocks: (m: number, profile_addr: string, page?: number, pageSize?: number) => Promise<PaginatedPlaces>;
  searchPlaces: (m: number, profile_addr: string, query: string, page?: number, pageSize?: number) => Promise<PaginatedPlaces>;
  getMatrix: (place_addr: string, profile_addr: string) => Promise<TreeNode>;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizedBase = (() => {
  const raw = appConfig.matrixApi.host || "";
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

const emptyPage: PaginatedPlaces = { items: [], page: 1, totalPages: 1 };
const emptyTree: TreeEmptyNode = { kind: "empty", is_next_pos: true };

const safeGet = async <T>(path: string, query?: Record<string, string | number | undefined>): Promise<T | null> => {
  try {
    const res = await fetch(buildUrl(path, query));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error("matrixService request error:", err);
    return null;
  }
};

export async function getRootPlace(m: number, profile_addr: string): Promise<MatrixPlace | null> {
  return safeGet<MatrixPlace>(`/api/matrix/${m}/${profile_addr}/root`);
}

export async function getNextPos(m: number, profile_addr: string): Promise<MatrixPlace | null> {
  return safeGet<MatrixPlace>(`/api/matrix/${m}/${profile_addr}/next-pos`);
}

export async function getPath(root_addr: string, place_addr: string): Promise<MatrixPlace[] | null> {
  return safeGet<MatrixPlace[]>("/api/matrix/path", { root_addr, place_addr });
}

export async function fetchPlaces(m: number, profile_addr: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  const result = await safeGet<PaginatedPlaces>(`/api/matrix/${m}/${profile_addr}/places`, { page, pageSize });
  return result ?? emptyPage;
}

export async function getPlacesCount(m: number, profile_addr: string): Promise<number> {
  const result = await safeGet<{ count: number }>(`/api/matrix/${m}/${profile_addr}/places/count`);
  return result?.count ?? 0;
}

export async function fetchLocks(m: number, profile_addr: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  const result = await safeGet<PaginatedPlaces>(`/api/matrix/${m}/${profile_addr}/locks`, { page, pageSize });
  return result ?? emptyPage;
}

export async function searchPlaces(m: number, profile_addr: string, query: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  const result = await safeGet<PaginatedPlaces>(`/api/matrix/${m}/${profile_addr}/search`, { query, page, pageSize });
  return result ?? emptyPage;
}

export async function getMatrix(place_addr: string, profile_addr: string): Promise<TreeNode> {
  const result = await safeGet<TreeNode>(`/api/matrix/${profile_addr}/tree/${place_addr}`);
  return result ?? emptyTree;
}

export const matrixService: MatrixService = {
  getRootPlace,
  getNextPos,
  getPath,
  fetchPlaces,
  getPlacesCount,
  fetchLocks,
  searchPlaces,
  getMatrix,
};

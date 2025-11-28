import { ErrorCode } from "../errors/ErrorCodes";

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

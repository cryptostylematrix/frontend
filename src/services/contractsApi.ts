import { appConfig } from "../config";

export type InviteAddressResponse = {
  addr: string;
};

export type InviteOwnerResponse = {
  owner_addr: string;
  set_at: number;
};

export type InviteDataResponse = {
  admin_addr: string;
  program: number;
  next_ref_no: number;
  number: number;
  parent_addr: string | null;
  owner?: InviteOwnerResponse | null;
};

export type PlacePosDataResponse = {
  parent_addr: string;
  pos: number;
};

export type MultiTaskPayloadResponse = {
  tag: number;
  source_addr?: string | null;
  pos?: PlacePosDataResponse | null;
};

export type MultiTaskItemResponse = {
  query_id: number;
  m: number;
  profile_addr: string;
  payload: MultiTaskPayloadResponse;
};

export type MinQueueTaskResponse = {
  key?: number | null;
  val?: MultiTaskItemResponse | null;
  flag: number;
};

export type MultiFeesDataResponse = {
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
};

export type MultiPricesDataResponse = {
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
};

export type MultiSecurityDataResponse = {
  admin_addr: string;
};

export type MultiQueueItemResponse = {
  key: number;
  val: MultiTaskItemResponse;
};

export type MultiDataResponse = {
  addr: string;
  processor_addr: string;
  max_tasks: number;
  queue_size: number;
  seq_no: number;
  fees: MultiFeesDataResponse;
  prices: MultiPricesDataResponse;
  security: MultiSecurityDataResponse;
  tasks: MultiQueueItemResponse[];
};

export type PlaceProfilesResponse = {
  clone: number;
  profile_addr: string;
  place_number: number;
  inviter_profile_addr?: string | null;
};

export type PlaceSecurityResponse = {
  admin_addr: string;
};

export type PlaceChildrenResponse = {
  left_addr: string;
  right_addr?: string | null;
};

export type PlaceDataResponse = {
  marketing_addr: string;
  m: number;
  parent_addr?: string | null;
  created_at: number;
  fill_count: number;
  profiles: PlaceProfilesResponse;
  security: PlaceSecurityResponse;
  children?: PlaceChildrenResponse | null;
};

export type NftAddressResponse = {
  addr: string;
};

export type ProfileContentResponse = {
  login: string;
  image_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  tg_username?: string | null;
};

export type ProfileDataResponse = {
  is_init: number;
  index: string;
  collection_addr: string;
  owner_addr?: string | null;
  content?: ProfileContentResponse | null;
};

export type ProgramDataResponse = {
  inviter_addr: string;
  seq_no: number;
  invite_addr: string;
  confirmed: number;
};

export type ProfileProgramsResponse = {
  multi?: ProgramDataResponse | null;
};

export type ContractBalanceResponse = {
  balance: number;
};

export type CollectionDataResponse = {
  addr: string;
  owner_addr: string;
};

export interface ContractsApi {
  getInviteAddrBySeqNo: (addr: string, seqNo: number) => Promise<InviteAddressResponse | null>;
  getInviteData: (addr: string) => Promise<InviteDataResponse | null>;
  getMinQueueTask: () => Promise<MinQueueTaskResponse | null>;
  getMultiData: () => Promise<MultiDataResponse | null>;
  getPlaceData: (addr: string) => Promise<PlaceDataResponse | null>;
  getNftAddrByLogin: (login: string) => Promise<NftAddressResponse | null>;
  getProfileNftData: (addr: string) => Promise<ProfileDataResponse | null>;
  getProfilePrograms: (addr: string) => Promise<ProfileProgramsResponse | null>;
  getContractBalance: (addr: string) => Promise<ContractBalanceResponse | null>;
  getCollectionData: () => Promise<CollectionDataResponse | null>;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizedBase = (() => {
  const raw = appConfig.contractsApi.host || "";
  if (!raw) return "";
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  return trimTrailingSlash(withProtocol);
})();

const defaultOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

const buildUrl = (path: string) => new URL(path, normalizedBase || defaultOrigin).toString();

const safeGet = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`Request failed with status ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("contractsApi request error:", err);
    return null;
  }
};

export async function getInviteAddrBySeqNo(addr: string, seqNo: number): Promise<InviteAddressResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;
  if (!Number.isFinite(seqNo)) return null;

  const url = buildUrl(`/contracts/invite/${normalizedAddr}/invite-addr-by-seq-no/${seqNo}`);
  return safeGet<InviteAddressResponse>(url);
}

export async function getInviteData(addr: string): Promise<InviteDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/invite/${normalizedAddr}/data`);
  return safeGet<InviteDataResponse>(url);
}

export async function getMinQueueTask(): Promise<MinQueueTaskResponse | null> {
  const url = buildUrl("/contracts/multi/min-queue-task");
  return safeGet<MinQueueTaskResponse>(url);
}

export async function getMultiData(): Promise<MultiDataResponse | null> {
  const url = buildUrl("/contracts/multi/data");
  return safeGet<MultiDataResponse>(url);
}

export async function getPlaceData(addr: string): Promise<PlaceDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/place/${normalizedAddr}/data`);
  return safeGet<PlaceDataResponse>(url);
}

export async function getNftAddrByLogin(login: string): Promise<NftAddressResponse | null> {
  const normalizedLogin = login?.trim();
  if (!normalizedLogin) return null;

  const url = buildUrl(`/contracts/profile-collection/nft-addr-by-login/${normalizedLogin}`);
  return safeGet<NftAddressResponse>(url);
}

export async function getProfileNftData(addr: string): Promise<ProfileDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/nft-data`);
  return safeGet<ProfileDataResponse>(url);
}

export async function getProfilePrograms(addr: string): Promise<ProfileProgramsResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/programs`);
  return safeGet<ProfileProgramsResponse>(url);
}

export async function getContractBalance(addr: string): Promise<ContractBalanceResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/general/${normalizedAddr}/balance`);
  return safeGet<ContractBalanceResponse>(url);
}

export async function getCollectionData(): Promise<CollectionDataResponse | null> {
  const url = buildUrl("/contracts/profile-collection/data");
  return safeGet<CollectionDataResponse>(url);
}

export const contractsApi: ContractsApi = {
  getInviteAddrBySeqNo,
  getInviteData,
  getMinQueueTask,
  getMultiData,
  getPlaceData,
  getNftAddrByLogin,
  getProfileNftData,
  getProfilePrograms,
  getContractBalance,
  getCollectionData,
};

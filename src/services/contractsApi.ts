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

export type ProfileProgramsResponse = Array<Record<string, ProgramDataResponse>>;

const normalizeProfileProgramKey = (key: string) => key.trim().replace(/^0x/i, "").toUpperCase();

const normalizeProgramValue = (program: number | string) => {
  if (typeof program === "number") return program.toString(16).toUpperCase();
  return normalizeProfileProgramKey(program);
};

export type BuildChooseInviterBodyRequest = {
  program: number;
  inviterAddr: string;
  seqNo: number;
  inviteAddr: string;
};

export type ChooseInviterBodyResponse = {
  boc_hex?: string;
};

export type BuildEditContentBodyRequest = {
  login: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
};

export type EditContentBodyResponse = {
  boc_hex?: string;
};

export type BuildDeployItemBodyRequest = {
  login: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
};

export type DeployItemBodyResponse = {
  boc_hex?: string;
};

export type LockPosBodyResponse = {
  boc_hex?: string;
};

export type UnlockPosBodyResponse = {
  boc_hex?: string;
};

export type QueryNumber = number | string | bigint;

export type BuildMarketingBuyPlaceByTonBodyRequest = {
  m: number;
  profileAddr: string;
  first: boolean;
  parentAddr?: string | null;
  pos?: number | null;
};

export type BuyPlaceByTonBodyResponse = {
  boc_hex?: string;
};

export type BuildMarketingBuyPlaceByJettonBodyRequest = BuildMarketingBuyPlaceByTonBodyRequest & {
  marketingAddr: string;
  amount: QueryNumber;
  senderAddr: string;
  fee: QueryNumber;
};

export type BuyPlaceByJettonBodyResponse = {
  boc_hex?: string;
};

export type BuildMarketingLockPosBodyRequest = {
  m: number;
  profileAddr: string;
  parentAddr: string;
  pos: number;
};

export type BuildMarketingUnlockPosBodyRequest = BuildMarketingLockPosBodyRequest;

export type MarketingTaskPayloadResponse = {
  tag: number;
  source_addr?: string | null;
  pos?: PlacePosDataResponse | null;
};

export type MarketingTaskResponse = {
  query_id: number;
  m: number;
  profile_addr: string;
  payload: MarketingTaskPayloadResponse;
};

export type FirstTaskResponse = {
  key?: number | null;
  val?: MarketingTaskResponse | null;
  flag: number;
};

export type RewardResponse = {
  tag: string;
  m?: number | null;
  count?: number | null;
  amount?: number | string | null;
};

export type ProgramSubscriptionResponse = Record<string, never>;

export type ProgramFeaturesResponse = {
  version?: number | null;
  admin_locks?: boolean | null;
  subscription?: ProgramSubscriptionResponse | null;
};

export type MatrixFeaturesResponse = {
  version?: number | null;
  distribution?: string | null;
  management?: string | null;
  cut_factor?: number | null;
  prev_required?: boolean | null;
};

export type MarketingParamsResponse = {
  version?: number | null;
  program_id?: number | null;
  metadata_uri?: string | null;
  program_features?: ProgramFeaturesResponse | null;
  matrix_features?: Record<string, MatrixFeaturesResponse> | null;
};

export type MatrixConfigResponse = {
  price: number | string;
  owner_addr: string;
  royalty_numerator: number;
  royalty_denominator: number;
  width: number;
  height: number;
  rewards: Record<string, RewardResponse[]>;
  name: string;
};

export type MarketingDataResponse = {
  admin_addr: string;
  index: number;
  max_tasks: number;
  queue_size: number;
  seq_no: number;
  processor_addr: string;
  jetton_wallet_addr?: string | null;
  initial_fee: number | string;
  queue: Record<string, MarketingTaskResponse>;
  matrixes: Record<string, MatrixConfigResponse>;
  fees: Record<string, number | string>;
  params: MarketingParamsResponse;
};

export type MarketingV3BasicDataResponse = {
  init: number;
  admin_addr: string;
  index: number;
  series_tag: number;
  metadata_uri: string | null;
};

export type MarketingV3MessageBodyResponse = {
  boc_hex: string;
};

export type BuildMarketingV3ExecMessageBodyRequest = {
  queryId: number | string | bigint;
  structure: number;
  profileAddr: string;
  commandTag: number;
  payloadBocHex?: string | null;
};

export type MarketingV3PlaceRefResponse = {
  struct: number;
  profile_addr: string | null;
  place_number: number;
};

export type MarketingV3RelativePlaceRefResponse = {
  source: MarketingV3PlaceRefResponse;
  level: number;
};

export type MarketingV3PlaceInfoResponse = {
  place_number: number;
  profile_login: string | null;
};

export type MarketingV3TaskCommandResponse = {
  tag: number;
  struct: number | null;
  command_struct: number | null;
  command_tag: number;
  profile_addr: string | null;
  source_addr: string | null;
  amount: number | null;
  sender_jetton_wallet: string | null;
  relative: MarketingV3RelativePlaceRefResponse | null;
};

export type MarketingV3TaskQueryResponse = {
  tag: number;
  struct: number | null;
  bonus_type_tag: number;
  relative: MarketingV3RelativePlaceRefResponse | null;
  reason: MarketingV3PlaceInfoResponse | null;
  recipient_profile_addr: string | null;
  amount: number;
  sender_jetton_wallet: string | null;
  bonus_title: string;
};

export type MarketingV3TaskResponse = {
  query_id: number;
  command: MarketingV3TaskCommandResponse | null;
  query: MarketingV3TaskQueryResponse | null;
  payload_boc_hex: string | null;
};

export type MarketingV3CommandConfigResponse = {
  price: number;
  sender_jetton_wallet: string | null;
  gram_fee: number;
};

export type MarketingV3RewardResponse = {
  tag: number;
  from_level: number | null;
  to_level: number | null;
  count: number | null;
  struct: number | null;
  command_struct: number | null;
  command_tag: number | null;
  bonus_type_tag: number | null;
  profile_addr: string | null;
  recipient: string | null;
  amount: number | null;
  sender_jetton_wallet: string | null;
  forward_ton_amount: number | null;
  title: string | null;
  payload_boc_hex: string | null;
};

export type MarketingV3RewardConfigResponse = {
  sets: Record<string, MarketingV3RewardResponse[]>;
};

export type MarketingV3RoyaltyConfigResponse = {
  numerator: number;
  denominator: number;
  recipient: string | null;
};

export type MarketingV3StructureConfigResponse = {
  commands: Record<string, MarketingV3CommandConfigResponse>;
  rewards: Record<string, MarketingV3RewardConfigResponse>;
  royalties: Record<string, MarketingV3RoyaltyConfigResponse>;
  name: string;
};

export type MarketingV3DataResponse = {
  admin_addr: string;
  index: number;
  series_tag: number;
  metadata_uri: string;
  max_tasks: number;
  queue_size: number;
  seq_no: number;
  processor_addr: string;
  queue: Record<string, MarketingV3TaskResponse>;
  structures: Record<string, MarketingV3StructureConfigResponse>;
  prefix_boc_hex: string;
};

export type PlaceInfoResponse = {
  kind: number;
  profile_addr: string;
  place_number: number;
  inviter_profile_addr?: string | null;
};

export type PlaceDescendantsResponse = Record<string, never>;

export type MatrixPlaceDataResponse = {
  init: boolean;
  marketing_addr: string;
  m: number;
  parent_addr?: string | null;
  pos: number;
  seq_no: number;
  width: number;
  height: number;
  admin_addr?: string | null;
  info?: PlaceInfoResponse | null;
  descendants?: PlaceDescendantsResponse | null;
};

export type JettonWalletAddressResponse = {
  wallet_addr: string;
};

export type JettonWalletDataResponse = {
  balance: number | string;
  owner_addr: string;
  minter_addr: string;
};

export type JettonMinterDataResponse = {
  total_supply: string;
  mintable: boolean;
  admin_address: string;
  metadata_uri?: string | null;
  decimals?: number | null;
  content_boc_hex: string;
  wallet_code_boc_hex: string;
};

export type BuildJettonTransferMsgBodyRequest = {
  queryId: QueryNumber;
  amount: QueryNumber;
  destinationAddr: string;
  responseDestinationAddr?: string | null;
  customPayloadBocHex?: string | null;
  forwardTonAmount: QueryNumber;
  forwardPayloadBocHex?: string | null;
};

export type JettonTransferMsgBodyResponse = {
  boc_hex: string;
};

export type ContractBalanceResponse = {
  balance: number;
};

export type CollectionDataResponse = {
  addr: string;
  owner_addr: string;
};

export type TransactionMessageResponse = {
  addr: string;
  value: number;
  op: string;
  comment: string;
  profile_addr: string;
};

export type TransactionResponse = {
  hash: string;
  lt: number;
  unix_time: number;
  messages: TransactionMessageResponse[];
};

export type TransactionHistoryResponse = {
  items: TransactionResponse[];
};

export type WalletHistoryRequest = {
  limit?: number;
  lt?: number;
  hash?: string;
};

export interface ContractsApi {
  getInviteAddrBySeqNo: (addr: string, seqNo: number) => Promise<InviteAddressResponse | null>;
  getInviteData: (addr: string) => Promise<InviteDataResponse | null>;
  getPlaceData: (addr: string) => Promise<PlaceDataResponse | null>;
  getNftAddrByLogin: (login: string) => Promise<NftAddressResponse | null>;
  getProfileNftData: (addr: string) => Promise<ProfileDataResponse | null>;
  refreshProfileNftData: (addr: string) => Promise<ProfileDataResponse | null>;
  getProfilePrograms: (addr: string) => Promise<ProfileProgramsResponse | null>;
  getProfileProgram: (addr: string, program: number | string) => Promise<ProgramDataResponse | null>;
  getContractBalance: (addr: string) => Promise<ContractBalanceResponse | null>;
  getCollectionData: () => Promise<CollectionDataResponse | null>;
  getWalletHistory: (addr: string, request?: WalletHistoryRequest) => Promise<TransactionHistoryResponse | null>;
  buildChooseInviterBody: (request: BuildChooseInviterBodyRequest) => Promise<ChooseInviterBodyResponse | null>;
  buildEditContentBody: (request: BuildEditContentBodyRequest) => Promise<EditContentBodyResponse | null>;
  buildDeployItemBody: (request: BuildDeployItemBodyRequest) => Promise<DeployItemBodyResponse | null>;
  buildMarketingBuyPlaceByTonBody: (request: BuildMarketingBuyPlaceByTonBodyRequest) => Promise<BuyPlaceByTonBodyResponse | null>;
  buildMarketingBuyPlaceByJettonBody: (request: BuildMarketingBuyPlaceByJettonBodyRequest) => Promise<BuyPlaceByJettonBodyResponse | null>;
  buildMarketingLockPosBody: (request: BuildMarketingLockPosBodyRequest) => Promise<LockPosBodyResponse | null>;
  buildMarketingUnlockPosBody: (request: BuildMarketingUnlockPosBodyRequest) => Promise<UnlockPosBodyResponse | null>;
  getMarketingFirstTask: (addr: string) => Promise<FirstTaskResponse | null>;
  getMarketingData: (addr: string) => Promise<MarketingDataResponse | null>;
  getMarketingV3BasicData: (addr: string) => Promise<MarketingV3BasicDataResponse | null>;
  getMarketingV3Data: (addr: string) => Promise<MarketingV3DataResponse | null>;
  buildMarketingV3ExecMessageBody: (
    request: BuildMarketingV3ExecMessageBodyRequest,
  ) => Promise<MarketingV3MessageBodyResponse | null>;
  getMatrixPlaceData: (addr: string) => Promise<MatrixPlaceDataResponse | null>;
  getJettonWalletAddress: (addr: string, ownerAddr: string) => Promise<JettonWalletAddressResponse | null>;
  getJettonWalletData: (addr: string) => Promise<JettonWalletDataResponse | null>;
  getJettonMinterData: (addr: string) => Promise<JettonMinterDataResponse | null>;
  buildJettonTransferMsgBody: (
    request: BuildJettonTransferMsgBodyRequest,
  ) => Promise<JettonTransferMsgBodyResponse | null>;
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

const safeDelete = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { method: "DELETE" });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`Request failed with status ${res.status}`);
      return null;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
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

export async function refreshProfileNftData(addr: string): Promise<ProfileDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/nft-data`);
  return safeDelete<ProfileDataResponse>(url);
}

export async function getProfilePrograms(addr: string): Promise<ProfileProgramsResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/profile-item/${normalizedAddr}/programs`);
  return safeGet<ProfileProgramsResponse>(url);
}

export async function getProfileProgram(addr: string, program: number | string): Promise<ProgramDataResponse | null> {
  const programs = await getProfilePrograms(addr);
  if (!programs) return null;

  const targetKey = normalizeProgramValue(program);
  for (const programMap of programs) {
    for (const [key, value] of Object.entries(programMap)) {
      if (normalizeProfileProgramKey(key) === targetKey) {
        return value;
      }
    }
  }

  return null;
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

export async function getWalletHistory(
  addr: string,
  request: WalletHistoryRequest = {},
): Promise<TransactionHistoryResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = new URL(`/contracts/wallet/${normalizedAddr}/history`, normalizedBase || defaultOrigin);
  if (request.limit !== undefined) url.searchParams.set("limit", String(request.limit));
  if (request.lt !== undefined) url.searchParams.set("lt", String(request.lt));
  if (request.hash) url.searchParams.set("hash", request.hash);

  return safeGet<TransactionHistoryResponse>(url.toString());
}

export async function buildChooseInviterBody(request: BuildChooseInviterBodyRequest): Promise<ChooseInviterBodyResponse | null> {
  const inviterAddr = request.inviterAddr?.trim();
  const inviteAddr = request.inviteAddr?.trim();
  if (!inviterAddr || !inviteAddr) return null;
  if (!Number.isFinite(request.program)) return null;
  if (!Number.isFinite(request.seqNo)) return null;

  const url = new URL("/contracts/profile-item/body/choose-inviter", normalizedBase || defaultOrigin);
  url.searchParams.set("program", String(request.program));
  url.searchParams.set("inviterAddr", inviterAddr);
  url.searchParams.set("seqNo", String(request.seqNo));
  url.searchParams.set("inviteAddr", inviteAddr);

  return safeGet<ChooseInviterBodyResponse>(url.toString());
}

export async function buildEditContentBody(request: BuildEditContentBodyRequest): Promise<EditContentBodyResponse | null> {
  const login = request.login?.trim();
  if (!login) return null;

  const url = new URL("/contracts/profile-item/body/edit-content", normalizedBase || defaultOrigin);
  url.searchParams.set("login", login);
  if (request.imageUrl) url.searchParams.set("imageUrl", request.imageUrl);
  if (request.firstName) url.searchParams.set("firstName", request.firstName);
  if (request.lastName) url.searchParams.set("lastName", request.lastName);
  if (request.tgUsername) url.searchParams.set("tgUsername", request.tgUsername);

  return safeGet<EditContentBodyResponse>(url.toString());
}

export async function buildDeployItemBody(request: BuildDeployItemBodyRequest): Promise<DeployItemBodyResponse | null> {
  const login = request.login?.trim();
  if (!login) return null;

  const url = new URL("/contracts/profile-collection/body/deploy-item-content", normalizedBase || defaultOrigin);
  url.searchParams.set("login", login);
  if (request.imageUrl) url.searchParams.set("imageUrl", request.imageUrl);
  if (request.firstName) url.searchParams.set("firstName", request.firstName);
  if (request.lastName) url.searchParams.set("lastName", request.lastName);
  if (request.tgUsername) url.searchParams.set("tgUsername", request.tgUsername);

  return safeGet<DeployItemBodyResponse>(url.toString());
}

export async function buildMarketingBuyPlaceByTonBody(
  request: BuildMarketingBuyPlaceByTonBodyRequest,
): Promise<BuyPlaceByTonBodyResponse | null> {
  if (!Number.isFinite(request.m)) return null;
  const profileAddr = request.profileAddr?.trim();
  const parentAddr = request.parentAddr?.trim();
  const pos = request.pos ?? undefined;
  if (!profileAddr) return null;

  const url = new URL("/contracts/marketing/body/buy-place-by-ton", normalizedBase || defaultOrigin);
  url.searchParams.set("m", String(request.m));
  url.searchParams.set("profileAddr", profileAddr);
  url.searchParams.set("first", String(request.first));
  if (parentAddr) url.searchParams.set("parentAddr", parentAddr);
  if (pos !== undefined && pos !== null) url.searchParams.set("pos", String(pos));

  return safeGet<BuyPlaceByTonBodyResponse>(url.toString());
}

export async function buildMarketingBuyPlaceByJettonBody(
  request: BuildMarketingBuyPlaceByJettonBodyRequest,
): Promise<BuyPlaceByJettonBodyResponse | null> {
  if (!Number.isFinite(request.m)) return null;
  const marketingAddr = request.marketingAddr?.trim();
  const profileAddr = request.profileAddr?.trim();
  const parentAddr = request.parentAddr?.trim();
  const senderAddr = request.senderAddr?.trim();
  const pos = request.pos ?? undefined;
  if (!marketingAddr || !profileAddr || !senderAddr) return null;

  const url = new URL("/contracts/marketing/body/buy-place-by-jetton", normalizedBase || defaultOrigin);
  url.searchParams.set("marketingAddr", marketingAddr);
  url.searchParams.set("m", String(request.m));
  url.searchParams.set("profileAddr", profileAddr);
  url.searchParams.set("first", String(request.first));
  if (parentAddr) url.searchParams.set("parentAddr", parentAddr);
  if (pos !== undefined && pos !== null) url.searchParams.set("pos", String(pos));
  url.searchParams.set("amount", String(request.amount));
  url.searchParams.set("senderAddr", senderAddr);
  url.searchParams.set("fee", String(request.fee));

  return safeGet<BuyPlaceByJettonBodyResponse>(url.toString());
}

export async function buildMarketingLockPosBody(request: BuildMarketingLockPosBodyRequest): Promise<LockPosBodyResponse | null> {
  if (!Number.isFinite(request.m)) return null;
  const profileAddr = request.profileAddr?.trim();
  const parentAddr = request.parentAddr?.trim();
  const pos = request.pos;
  if (!profileAddr || !parentAddr || !Number.isFinite(pos)) return null;

  const url = new URL("/contracts/marketing/body/lock-pos", normalizedBase || defaultOrigin);
  url.searchParams.set("m", String(request.m));
  url.searchParams.set("profile_addr", profileAddr);
  url.searchParams.set("parent_addr", parentAddr);
  url.searchParams.set("pos", String(pos));

  return safeGet<LockPosBodyResponse>(url.toString());
}

export async function buildMarketingUnlockPosBody(request: BuildMarketingUnlockPosBodyRequest): Promise<UnlockPosBodyResponse | null> {
  if (!Number.isFinite(request.m)) return null;
  const profileAddr = request.profileAddr?.trim();
  const parentAddr = request.parentAddr?.trim();
  const pos = request.pos;
  if (!profileAddr || !parentAddr || !Number.isFinite(pos)) return null;

  const url = new URL("/contracts/marketing/body/unlock-pos", normalizedBase || defaultOrigin);
  url.searchParams.set("m", String(request.m));
  url.searchParams.set("profile_addr", profileAddr);
  url.searchParams.set("parent_addr", parentAddr);
  url.searchParams.set("pos", String(pos));

  return safeGet<UnlockPosBodyResponse>(url.toString());
}

export async function getMarketingFirstTask(addr: string): Promise<FirstTaskResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/marketing/${normalizedAddr}/first-task`);
  return safeGet<FirstTaskResponse>(url);
}

export async function getMarketingData(addr: string): Promise<MarketingDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/marketing/${normalizedAddr}/data`);
  return safeGet<MarketingDataResponse>(url);
}

export async function getMarketingV3BasicData(
  addr: string,
): Promise<MarketingV3BasicDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(
    `/contracts/marketing-v3/${encodeURIComponent(normalizedAddr)}/basic-data`,
  );
  return safeGet<MarketingV3BasicDataResponse>(url);
}

export async function getMarketingV3Data(
  addr: string,
): Promise<MarketingV3DataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(
    `/contracts/marketing-v3/${encodeURIComponent(normalizedAddr)}/data`,
  );
  return safeGet<MarketingV3DataResponse>(url);
}

export async function buildMarketingV3ExecMessageBody(
  request: BuildMarketingV3ExecMessageBodyRequest,
): Promise<MarketingV3MessageBodyResponse | null> {
  const profileAddr = request.profileAddr?.trim();
  if (
    !profileAddr ||
    !Number.isInteger(request.structure) ||
    !Number.isInteger(request.commandTag)
  ) {
    return null;
  }

  const url = new URL(
    "/contracts/marketing-v3/body/exec",
    normalizedBase || defaultOrigin,
  );
  url.searchParams.set("query_id", String(request.queryId));
  url.searchParams.set("structure", String(request.structure));
  url.searchParams.set("profile_addr", profileAddr);
  url.searchParams.set("command_tag", String(request.commandTag));
  if (request.payloadBocHex) {
    url.searchParams.set("payload_boc_hex", request.payloadBocHex);
  }

  return safeGet<MarketingV3MessageBodyResponse>(url.toString());
}

export async function getMatrixPlaceData(addr: string): Promise<MatrixPlaceDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/matrix-place/${normalizedAddr}/data`);
  return safeGet<MatrixPlaceDataResponse>(url);
}

export async function getJettonWalletAddress(addr: string, ownerAddr: string): Promise<JettonWalletAddressResponse | null> {
  const normalizedAddr = addr?.trim();
  const normalizedOwnerAddr = ownerAddr?.trim();
  if (!normalizedAddr || !normalizedOwnerAddr) return null;

  const url = new URL(`/contracts/jetton-minter/${normalizedAddr}/wallet-addr`, normalizedBase || defaultOrigin);
  url.searchParams.set("ownerAddr", normalizedOwnerAddr);
  return safeGet<JettonWalletAddressResponse>(url.toString());
}

export async function getJettonWalletData(addr: string): Promise<JettonWalletDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(`/contracts/jetton-wallet/${normalizedAddr}/data`);
  return safeGet<JettonWalletDataResponse>(url);
}

export async function getJettonMinterData(
  addr: string,
): Promise<JettonMinterDataResponse | null> {
  const normalizedAddr = addr?.trim();
  if (!normalizedAddr) return null;

  const url = buildUrl(
    `/contracts/jetton-minter/${encodeURIComponent(normalizedAddr)}/data`,
  );
  return safeGet<JettonMinterDataResponse>(url);
}

export async function buildJettonTransferMsgBody(
  request: BuildJettonTransferMsgBodyRequest,
): Promise<JettonTransferMsgBodyResponse | null> {
  const destinationAddr = request.destinationAddr?.trim();
  if (!destinationAddr) return null;

  const url = new URL(
    "/contracts/jetton-wallet/body/transfer",
    normalizedBase || defaultOrigin,
  );
  url.searchParams.set("query_id", String(request.queryId));
  url.searchParams.set("amount", String(request.amount));
  url.searchParams.set("destination_addr", destinationAddr);
  url.searchParams.set("forward_ton_amount", String(request.forwardTonAmount));

  const responseDestinationAddr = request.responseDestinationAddr?.trim();
  if (responseDestinationAddr) {
    url.searchParams.set("response_destination_addr", responseDestinationAddr);
  }
  if (request.customPayloadBocHex) {
    url.searchParams.set("custom_payload_boc_hex", request.customPayloadBocHex);
  }
  if (request.forwardPayloadBocHex) {
    url.searchParams.set(
      "forward_payload_boc_hex",
      request.forwardPayloadBocHex,
    );
  }

  return safeGet<JettonTransferMsgBodyResponse>(url.toString());
}

export const contractsApi: ContractsApi = {
  getInviteAddrBySeqNo,
  getInviteData,
  getPlaceData,
  getNftAddrByLogin,
  getProfileNftData,
  refreshProfileNftData,
  getProfilePrograms,
  getProfileProgram,
  getContractBalance,
  getCollectionData,
  getWalletHistory,
  buildChooseInviterBody,
  buildEditContentBody,
  buildDeployItemBody,
  buildMarketingBuyPlaceByTonBody,
  buildMarketingBuyPlaceByJettonBody,
  buildMarketingLockPosBody,
  buildMarketingUnlockPosBody,
  getMarketingFirstTask,
  getMarketingData,
  getMarketingV3BasicData,
  getMarketingV3Data,
  buildMarketingV3ExecMessageBody,
  getMatrixPlaceData,
  getJettonWalletAddress,
  getJettonWalletData,
  getJettonMinterData,
  buildJettonTransferMsgBody,
};

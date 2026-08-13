import { appConfig } from "../config";

export type InviterDataResponse = {
  inviter_profile_addr: string;
};

export type InviteData = {
  profile_addr: string;
  profile_login: string;
  inviter_profile_addr: string | null;
  inviter_profile_login: string | null;
  created_at: number | string;
  activated_at: number | string;
  filling: number;
  ative: boolean;
};

export type InviteInfo = InviteData;

export type ProgramPlace = {
  marketing_addr: string;
  struct: number;
  profile_addr: string | null;
  place_number: number;
  profile_login: string | null;
  parent_profile_addr: string | null;
  parent_profile_login: string | null;
  parent_place_number: number | null;
  created_at: number;
  activated_at: number | null;
  ative: boolean;
  kind: number;
  pos: number;
  filling: number;
  deep: number;
  personal_volume: number;
  group_volume: number;
};

export type ProgramPlaceRef = Pick<
  ProgramPlace,
  "profile_addr" | "place_number"
>;

export type ProgramPaginated<T> = {
  items: T[];
  page: number;
  total_pages: number;
};

export type PlacesCountResponse = {
  count: number;
};

export type ProgramPosGroupV1 = {
  id: number;
  algo: string;
  weight: number;
};

export type ProgramPosAlgoV1 = {
  v: number;
  root: string;
  groups: ProgramPosGroupV1[];
  relation: string;
};

export type ProgramStructure = {
  marketing_addr: string;
  structure_number: number;
  max_places_per_profile: number;
  width: number;
  height: number;
  display_height: number;
  prev_required: boolean;
  pos_algo: ProgramPosAlgoV1;
};

type ProgramTreeNodeBase = {
  locked: boolean;
  is_lock: boolean;
  can_lock: boolean;
  can_unlock: boolean;
  parent_profile_addr: string | null;
  parent_place_number: number | null;
  pos: number;
  width: number;
  height: number;
  children: ProgramTreeNode[] | null;
};

export type ProgramTreeEmptyNode = ProgramTreeNodeBase & {
  node_type: "empty";
  is_next_pos: boolean;
  can_buy: boolean;
  buy_command_tag: number | null;
  include_position: boolean;
};

export type ProgramTreeFilledNode = ProgramTreeNodeBase & {
  node_type: "filled";
  place_number: number;
  profile_addr: string | null;
  profile_login: string | null;
  kind: number;
  filling: number;
  matrix_places_count: number;
  descendants: number;
  level: number;
  is_active: boolean;
  created_at: number;
  activated_at: number | null;
  is_root: boolean;
};

export type ProgramTreeNode =
  | ProgramTreeEmptyNode
  | ProgramTreeFilledNode;

export type ProgramLock = {
  marketing_addr: string;
  struct: number;
  place_profile_addr: string;
  place_number: number;
  place_profile_login: string;
  locked_pos: number;
  created_at: number;
};

export type NextPosResponse = {
  profile_addr: string | null;
  place_number: number;
  pos: number;
};

export type PurchaseOption = {
  can_buy: boolean;
  command_tag: number | null;
  include_position: boolean;
  position: NextPosResponse | null;
  reason: string | null;
};

export interface ProgramApi {
  getInviterData: (
    marketingAddress: string,
    profileAddress: string,
  ) => Promise<InviterDataResponse | null>;
  getInviteInfo: (
    marketingAddress: string,
    profileAddress: string,
  ) => Promise<InviteData | null>;
  getRootInviteInfo: (
    marketingAddress: string,
  ) => Promise<InviteInfo | null>;
  getStructure: (
    marketingAddress: string,
    structureNumber: number,
  ) => Promise<ProgramStructure | null>;
  getFirstPlace: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress?: string | null,
  ) => Promise<ProgramPlace | null>;
  getLastPlace: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress?: string | null,
  ) => Promise<ProgramPlace | null>;
  getTopPlace: (
    marketingAddress: string,
    structureNumber: number,
  ) => Promise<ProgramPlace | null>;
  getPlaces: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
    page?: number,
    pageSize?: number,
  ) => Promise<ProgramPaginated<ProgramPlace> | null>;
  getPlacesCount: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
  ) => Promise<PlacesCountResponse | null>;
  searchPlaces: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
    query: string,
    page?: number,
    pageSize?: number,
  ) => Promise<ProgramPaginated<ProgramPlace> | null>;
  getLocks: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
    page?: number,
    pageSize?: number,
  ) => Promise<ProgramPaginated<ProgramLock> | null>;
  getNextPos: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
  ) => Promise<NextPosResponse | null>;
  getPurchaseOption: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string,
    position?: {
      parentProfileAddress: string | null;
      parentPlaceNumber: number;
      position: number;
    } | null,
  ) => Promise<PurchaseOption | null>;
  getPath: (
    marketingAddress: string,
    structureNumber: number,
    viewerProfileAddress: string,
    targetProfileAddress: string | null,
    targetPlaceNumber: number,
  ) => Promise<ProgramPlace[] | null>;
  getTree: (
    marketingAddress: string,
    structureNumber: number,
    profileAddress: string | null,
    placeNumber: number,
    viewerProfileAddress: string,
    viewerWalletAddress: string | null,
    fromPos: number,
    toPos: number,
  ) => Promise<ProgramTreeNode | null>;
  getReferrals: (
    marketingAddress: string,
    profileAddress: string,
    pageNumber: number,
    pageSize: number,
  ) => Promise<ProgramPaginated<InviteData> | null>;
}

const normalizedBase = appConfig.programApi.host.replace(/\/+$/, "");
const defaultOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

const buildUrl = (
  marketingAddress: string,
  path: string,
  query: Record<string, string | number | null | undefined>,
) => {
  const url = new URL(`/api/program/${encodeURIComponent(marketingAddress)}/${path}`, normalizedBase || defaultOrigin);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const safeGet = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    console.error("programApi request error:", error);
    return null;
  }
};

export async function getInviterData(
  marketingAddress: string,
  profileAddress: string,
): Promise<InviterDataResponse | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (!normalizedMarketingAddress || !normalizedProfileAddress) return null;

  return safeGet<InviterDataResponse>(
    buildUrl(normalizedMarketingAddress, "inviter", {
      profile_addr: normalizedProfileAddress,
    }),
  );
}

export async function getInviteInfo(
  marketingAddress: string,
  profileAddress: string,
): Promise<InviteData | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (!normalizedMarketingAddress || !normalizedProfileAddress) return null;

  return safeGet<InviteData>(
    buildUrl(normalizedMarketingAddress, "invite-info", {
      profile_addr: normalizedProfileAddress,
    }),
  );
}

export async function getRootInviteInfo(
  marketingAddress: string,
): Promise<InviteInfo | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  if (!normalizedMarketingAddress) return null;

  return safeGet<InviteInfo>(
    buildUrl(normalizedMarketingAddress, "root-invite-info", {}),
  );
}

export async function getStructure(
  marketingAddress: string,
  structureNumber: number,
): Promise<ProgramStructure | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<ProgramStructure>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}`,
      {},
    ),
  );
}

export async function getFirstPlace(
  marketingAddress: string,
  structureNumber: number,
  profileAddress?: string | null,
): Promise<ProgramPlace | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress?.trim();
  if (
    !normalizedMarketingAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<ProgramPlace>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/first-place`,
      normalizedProfileAddress
        ? { profile_addr: normalizedProfileAddress }
        : {},
    ),
  );
}

export async function getLastPlace(
  marketingAddress: string,
  structureNumber: number,
  profileAddress?: string | null,
): Promise<ProgramPlace | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress?.trim();
  if (
    !normalizedMarketingAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<ProgramPlace>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/last-place`,
      normalizedProfileAddress
        ? { profile_addr: normalizedProfileAddress }
        : {},
    ),
  );
}

export async function getTopPlace(
  marketingAddress: string,
  structureNumber: number,
): Promise<ProgramPlace | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<ProgramPlace>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/top-place`,
      {},
    ),
  );
}

export async function getPlaces(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
  page = 1,
  pageSize = 20,
): Promise<ProgramPaginated<ProgramPlace> | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255 ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1
  ) {
    return null;
  }

  return safeGet<ProgramPaginated<ProgramPlace>>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/places`,
      {
        profile_addr: normalizedProfileAddress,
        page,
        page_size: pageSize,
      },
    ),
  );
}

export async function getPlacesCount(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
): Promise<PlacesCountResponse | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<PlacesCountResponse>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/places/count`,
      { profile_addr: normalizedProfileAddress },
    ),
  );
}

export async function searchPlaces(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
  query: string,
  page = 1,
  pageSize = 20,
): Promise<ProgramPaginated<ProgramPlace> | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  const normalizedQuery = query.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !normalizedQuery ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255 ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1
  ) {
    return null;
  }

  return safeGet<ProgramPaginated<ProgramPlace>>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/places/search`,
      {
        viewer_profile_addr: normalizedProfileAddress,
        query: normalizedQuery,
        page,
        page_size: pageSize,
      },
    ),
  );
}

export async function getLocks(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
  page = 1,
  pageSize = 20,
): Promise<ProgramPaginated<ProgramLock> | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255 ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1
  ) {
    return null;
  }

  return safeGet<ProgramPaginated<ProgramLock>>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/locks`,
      {
        profile_addr: normalizedProfileAddress,
        page,
        page_size: pageSize,
      },
    ),
  );
}

export async function getNextPos(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
): Promise<NextPosResponse | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<NextPosResponse>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/next-pos`,
      { profile_addr: normalizedProfileAddress },
    ),
  );
}

export async function getPurchaseOption(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string,
  position?: {
    parentProfileAddress: string | null;
    parentPlaceNumber: number;
    position: number;
  } | null,
): Promise<PurchaseOption | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (
    !normalizedMarketingAddress ||
    !normalizedProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255
  ) {
    return null;
  }

  return safeGet<PurchaseOption>(
    buildUrl(
      normalizedMarketingAddress,
      `structures/${structureNumber}/purchase-option`,
      {
        profile_addr: normalizedProfileAddress,
        parent_profile_addr: position?.parentProfileAddress,
        parent_place_number: position?.parentPlaceNumber,
        position: position?.position,
      },
    ),
  );
}

export async function getPath(
  marketingAddress: string,
  structureNumber: number,
  viewerProfileAddress: string,
  targetProfileAddress: string | null,
  targetPlaceNumber: number,
): Promise<ProgramPlace[] | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedViewerProfileAddress = viewerProfileAddress.trim();
  const normalizedTargetProfileAddress = targetProfileAddress?.trim() ?? "";
  const isValidPlaceNumber = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

  if (
    !normalizedMarketingAddress ||
    !normalizedViewerProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255 ||
    !isValidPlaceNumber(targetPlaceNumber)
  ) {
    return null;
  }

  return safeGet<ProgramPlace[]>(
    buildUrl(normalizedMarketingAddress, `structures/${structureNumber}/path`, {
      viewer_profile_addr: normalizedViewerProfileAddress,
      target_profile_addr: normalizedTargetProfileAddress,
      target_place_number: targetPlaceNumber,
    }),
  );
}

export async function getTree(
  marketingAddress: string,
  structureNumber: number,
  profileAddress: string | null,
  placeNumber: number,
  viewerProfileAddress: string,
  viewerWalletAddress: string | null,
  fromPos: number,
  toPos: number,
): Promise<ProgramTreeNode | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress?.trim() || null;
  const normalizedViewerProfileAddress = viewerProfileAddress.trim();
  const isUint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

  if (
    !normalizedMarketingAddress ||
    !normalizedViewerProfileAddress ||
    !Number.isInteger(structureNumber) ||
    structureNumber < 0 ||
    structureNumber > 255 ||
    !isUint32(placeNumber) ||
    !isUint32(fromPos) ||
    !isUint32(toPos)
  ) {
    return null;
  }

  return safeGet<ProgramTreeNode>(
    buildUrl(normalizedMarketingAddress, `structures/${structureNumber}/tree`, {
      profile_addr: normalizedProfileAddress,
      place_number: placeNumber,
      viewer_profile_addr: normalizedViewerProfileAddress,
      viewer_wallet_addr: viewerWalletAddress?.trim() || undefined,
      from_pos: fromPos,
      to_pos: toPos,
    }),
  );
}

export async function getReferrals(
  marketingAddress: string,
  profileAddress: string,
  pageNumber: number,
  pageSize: number,
): Promise<ProgramPaginated<InviteData> | null> {
  const normalizedMarketingAddress = marketingAddress.trim();
  const normalizedProfileAddress = profileAddress.trim();
  if (!normalizedMarketingAddress || !normalizedProfileAddress) return null;

  return safeGet<ProgramPaginated<InviteData>>(
    buildUrl(normalizedMarketingAddress, "referrals", {
      profile_addr: normalizedProfileAddress,
      page: pageNumber,
      page_size: pageSize,
    }),
  );
}

export const programApi: ProgramApi = {
  getInviterData,
  getInviteInfo,
  getRootInviteInfo,
  getStructure,
  getFirstPlace,
  getLastPlace,
  getTopPlace,
  getPlaces,
  getPlacesCount,
  searchPlaces,
  getLocks,
  getNextPos,
  getPurchaseOption,
  getPath,
  getTree,
  getReferrals,
};

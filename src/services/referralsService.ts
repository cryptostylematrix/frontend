import {
  getNftAddrByLogin,
  getProfileNftData,
  type ProfileContentResponse,
} from "./contractsApi";
import {
  getInviteInfo,
  getReferrals,
  type InviteData,
} from "./programApi";

export const REFERRALS_PAGE_SIZE = 20;

export type StructureNode = {
  addr: string;
  parent_addr: string | null;
  parent_login: string | null;
  login: string;
  firstName: string | null;
  lastName: string | null;
  tgUsername: string | null;
  createdAt: number | string;
  activatedAt: number | string;
  filling: number;
  active: boolean;
  children?: StructureNode[];
};

export type ReferralsRootResult = {
  success: boolean;
  node?: StructureNode;
};

export type ReferralsChildrenResult = {
  success: boolean;
  children: StructureNode[];
  page: number;
  totalPages: number;
};

const toNode = (
  invite: InviteData,
  profile: ProfileContentResponse | null | undefined,
): StructureNode => ({
  addr: invite.profile_addr,
  parent_addr: invite.inviter_profile_addr,
  parent_login: invite.inviter_profile_login,
  login: invite.profile_login,
  firstName: profile?.first_name ?? null,
  lastName: profile?.last_name ?? null,
  tgUsername: profile?.tg_username ?? null,
  createdAt: invite.created_at,
  activatedAt: invite.activated_at,
  filling: invite.filling,
  active: invite.ative,
});

export async function loadRootByLogin(
  login: string,
  marketingAddress: string,
): Promise<ReferralsRootResult> {
  const normalizedLogin = login.trim().toLowerCase();
  if (!normalizedLogin || !marketingAddress.trim()) return { success: false };

  try {
    const profile = await getNftAddrByLogin(normalizedLogin);
    if (!profile?.addr) return { success: false };

    const [invite, profileData] = await Promise.all([
      getInviteInfo(marketingAddress, profile.addr),
      getProfileNftData(profile.addr),
    ]);
    return invite
      ? { success: true, node: toNode(invite, profileData?.content) }
      : { success: false };
  } catch (error) {
    console.error("loadRootByLogin error:", error);
    return { success: false };
  }
}

export async function loadChildren(
  marketingAddress: string,
  profileAddress: string,
  pageNumber: number,
  pageSize = REFERRALS_PAGE_SIZE,
): Promise<ReferralsChildrenResult> {
  if (!marketingAddress.trim() || !profileAddress.trim()) {
    return { success: false, children: [], page: pageNumber, totalPages: 0 };
  }

  try {
    const result = await getReferrals(
      marketingAddress,
      profileAddress,
      pageNumber,
      pageSize,
    );
    if (!result) {
      return { success: false, children: [], page: pageNumber, totalPages: 0 };
    }

    const children = await Promise.all(
      result.items.map(async (invite) => {
        const profileData = await getProfileNftData(invite.profile_addr);
        return toNode(invite, profileData?.content);
      }),
    );

    return {
      success: true,
      children,
      page: result.page,
      totalPages: result.total_pages,
    };
  } catch (error) {
    console.error("loadChildren error:", error);
    return { success: false, children: [], page: pageNumber, totalPages: 0 };
  }
}

import { getInviteAddrBySeqNo, getInviteData, getNftAddrByLogin, getProfileNftData, getProfilePrograms } from "./contractsApi";

export type StructureNode = {
  addr: string; // invite_addr analogue
  parent_addr: string | null;
  parent_login: string | null;
  login: string;
  index: number;
  createdAt: string;
  referals: number;
  children?: StructureNode[];
  nextRefNo: number;
};

export type StructureRootResult = { success: boolean; node?: StructureNode };

export type StructureChildrenResult = {
  success: boolean;
  children: StructureNode[];
};

export interface StructureService {
  loadRootByLogin: (login: string) => Promise<StructureRootResult>;
  loadChildren: (node: StructureNode, from_ref_no: number, to_ref_no: number) => Promise<StructureChildrenResult>;
}


const toIsoDate = (timestamp?: number | bigint | null): string => {
  if (timestamp === null || timestamp === undefined) return new Date().toISOString();
  const asNumber = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const millis = asNumber > 1e12 ? asNumber : asNumber * 1000;
  return new Date(millis).toISOString();
};

export async function loadInviteLogin(inviteAddr: string) : Promise<string | null> {
  const inviteData = await getInviteData(inviteAddr);
  if (!inviteData) return null;

  const profileAddr = inviteData.owner?.owner_addr;
  if (!profileAddr) return null;

  const profileContentResult = await getProfileNftData(profileAddr);
  if (!profileContentResult?.content?.login) return null;

  return profileContentResult.content.login;
}

export async function loadRootByLogin(login: string): Promise<StructureRootResult> {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return { success: false };

  try {

    const profile = await getNftAddrByLogin(normalized);
    if (!profile?.addr) return { success: false };

    const program = await getProfilePrograms(profile.addr);
    const multiProgram = program?.multi;
    if (!multiProgram || multiProgram.confirmed !== 1) return { success: false };

    const inviteAddress = multiProgram.invite_addr;
    const inviteData = await getInviteData(inviteAddress);
    if (!inviteData) return { success: false };

    let inviterAddress: string | null = multiProgram.inviter_addr;

    if (inviterAddress == inviteAddress)
    {
      inviterAddress = null;
    }

    let inviterLogin: string | null = null;
    if (inviterAddress)
    {
      inviterLogin = await loadInviteLogin(inviterAddress);
    }


    const referals = inviteData.next_ref_no - 1;
    const createdAt = toIsoDate(inviteData.owner?.set_at ?? Date.now());
    const index = inviteData.number;


    return {
      success: true,
      node: {
        addr: inviteAddress,
        parent_addr: inviterAddress,
        parent_login: inviterLogin,
        login: normalized,
        index,
        createdAt,
        referals,

        nextRefNo: inviteData.next_ref_no,

      },
    };
  } catch (err) {
    console.error("loadRootByLogin error:", err);
    return { success: false };
  }
}

export async function loadChildren(node: StructureNode, from_ref_no: number, to_ref_no: number): Promise<StructureChildrenResult> {
  console.log(from_ref_no);
  console.log(to_ref_no);

  const parent_addr = node.addr.trim();
  if (!parent_addr) return { success: false, children: [] };

  try {
    const children: StructureNode[] = [];

    for (let i = from_ref_no; i < to_ref_no; i++) {

      const inviteAddressResult = await getInviteAddrBySeqNo(parent_addr, i);
      if (!inviteAddressResult) break;

      const inviteAddres = inviteAddressResult.addr;
      const inviteData = await getInviteData(inviteAddres);
      if (!inviteData) break;

      const ownerAddress = inviteData.owner?.owner_addr;
      if (!ownerAddress) break;

      const profile = await getProfileNftData(ownerAddress);
      if (!profile?.content?.login) break;

      const createdAt = toIsoDate(inviteData.owner?.set_at ?? Date.now());
      const referals = inviteData.next_ref_no - 1;

      children.push({
        addr: inviteAddressResult.addr,
        parent_addr: parent_addr,
        parent_login: node.login,
        login: profile.content.login,
        index: i,
        createdAt,
        referals,
        nextRefNo: inviteData.next_ref_no,
      });

    }

    return { success: children.length > 0, children };
  } catch (err) {
    console.error("loadChildren error:", err);
    return { success: false, children: [] };
  }
}

export const structureService: StructureService = {
  loadRootByLogin,
  loadChildren,
};

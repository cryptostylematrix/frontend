import { Address } from "@ton/core";
import { Programs } from "../contracts/MultiConstants";
import { getInviteAddressBySeqNo, getInviteData } from "./inviteService";
import { getProfileAddressByLogin } from "./profileCollectionService";
import { getNftData, getProfileDataByAddress, getProfileProgramData } from "./profileService";

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

const toFriendly = (address: Address) => address.toString({ urlSafe: true, bounceable: true, testOnly: false });

const toIsoDate = (timestamp?: number | bigint | null): string => {
  if (timestamp === null || timestamp === undefined) return new Date().toISOString();
  const asNumber = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const millis = asNumber > 1e12 ? asNumber : asNumber * 1000;
  return new Date(millis).toISOString();
};

export async function loadInviteLogin(inviteAddr: string) : Promise<string | null> {
  const InviteDataResult = await getInviteData(inviteAddr);
  if (!InviteDataResult.success)
  {
    return null;
  }

  const profileAddr = InviteDataResult.data.owner?.owner;
  if (!profileAddr)
  {
    return null;
  }

  const profileContentResult = await getNftData(toFriendly(profileAddr));
  if (!profileContentResult.success)
  {
    return null;
  }

  return profileContentResult.data.login;
}

export async function loadRootByLogin(login: string): Promise<StructureRootResult> {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return { success: false };

  try {
    const profile = await getProfileAddressByLogin(normalized);
    if (!profile.success) return { success: false };

    const program = await getProfileProgramData(profile.address, Programs.multi);
    if (!program.success || !program.data || !program.data.confirmed) return { success: false };

    const inviteAddress = toFriendly(program.data.invite);
    const inviteData = await getInviteData(inviteAddress);
    if (!inviteData.success || !inviteData.data) return { success: false };

    let inviterAddress: string | null = toFriendly(program.data.inviter);
    if (inviterAddress == inviteAddress)
    {
      inviterAddress = null;
    }

    let inviterLogin: string | null = null;
    if (inviterAddress)
    {
      inviterLogin = await loadInviteLogin(inviterAddress);
    }

    const referals = inviteData.data.next_ref_no - 1;
    const createdAt = toIsoDate(inviteData.data.owner?.set_at ?? Date.now());
    const index = inviteData.data.number;



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
        nextRefNo: inviteData.data.next_ref_no,
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

      const inviteAddressResult = await getInviteAddressBySeqNo(parent_addr, i);
      if (!inviteAddressResult.success) break;

      let inviteAddres = inviteAddressResult.address;
      if (node.addr == "EQDWtmELnfdGiCQeLCBcu8w0WGQ9KlWixQw4-Hekbf9teB2a" && i == 1) // upgradaed contract
      {
          inviteAddres = "EQAPqoZn7SXpwRLYHTmNpNdcr36iRFO4zfH8A9T-0wdaWh9X";
      }


      const inviteData = await getInviteData(inviteAddres);
      if (!inviteData.success || !inviteData.data) break;

      const ownerAddress = inviteData.data.owner?.owner;
      if (!ownerAddress) break;

      const profile = await getProfileDataByAddress(toFriendly(ownerAddress));
      if (!profile.success || !profile.data) break;

      const createdAt = toIsoDate(inviteData.data.owner?.set_at ?? Date.now());
      const referals = inviteData.data.next_ref_no - 1;

      children.push({
        addr: inviteAddressResult.address,
        parent_addr: parent_addr,
        parent_login: node.login,
        login: profile.data.login,
        index: i,
        createdAt,
        referals,
        nextRefNo: inviteData.data.next_ref_no,
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

import { Cell, beginCell } from "@ton/core";
import type { NftContentOnchain } from "./ProfileContent";


export const normalizeImage = (value?: string | null): string => {
  const lower = value?.trim().toLowerCase();
  return lower && lower !== "" ? lower : "https://cryptostylematrix.github.io/frontend/cs-big.png";
};

export const capitalize = (str?: string | null): string | undefined => {
  if (!str?.trim()) return undefined;
  const t = str.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

export const toLower = (str?: string | null): string | undefined => {
  return str?.trim() ? str.trim().toLowerCase() : undefined;
};


export const buildDeployItemBody = (content: Cell, login: string, queryId: number | bigint = 0): Cell =>
  beginCell()
    .storeUint(1, 32) // COLLECTION_DEPLOY_ITEM
    .storeUint(queryId, 64)
    .storeStringTail(login)
    .storeRef(content)
    .endCell();

export const buildEditContentBody = (content: Cell, queryId: number | bigint = 0): Cell =>
  beginCell().storeUint(0x1a0b9d51, 32).storeUint(queryId, 64).storeRef(content).endCell();


function packProfile(
    login: string,
    imageUrl?: string,
    firstName?: string,
    lastName?: string,
    tgUsername?: string
) {

    const formattedLogin = toLower(login)!;
    const formattedImageUrl = normalizeImage(imageUrl);
    const formattedFirstName = capitalize(firstName);
    const formattedLastName = capitalize(lastName);
    const formattedTgUsername = toLower(tgUsername);

    return {
        name: formattedLogin,
        description: 'Crypto Style Profile',
        image: formattedImageUrl,
        attributes: [
            { trait_type: 'firstName', value: formattedFirstName },
            { trait_type: 'lastName', value: formattedLastName },
            { trait_type: 'tgUsername', value: formattedTgUsername },
        ],
    };
}

export function profileToNftContent(
    login: string,
    imageUrl?: string,
    firstName?: string,
    lastName?: string,
    tgUsername?: string
): NftContentOnchain {
    const profile = packProfile(login, imageUrl, firstName, lastName, tgUsername);

    const onchain: NftContentOnchain = {
        type: 'onchain',
        data: {
            name: profile.name,
            description: profile.description,
            image: profile.image,
            attributes: JSON.stringify(profile.attributes), // 👈 store attributes as JSON
        },
    };

    return onchain;
}

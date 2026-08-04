export const UserCommandTag = {
  activatePlace: 0xf63f29c5,
  buyFirstPlace: 0xd7dd1e7a,
  buyPlace: 0xb070143f,
  buySysPlace: 0xe9cfbb76,
  buyTopPlace: 0x3f6eb1fa,
  chooseInviter: 0xbc13b755,
  lockPos: 0x6292cd93,
  unlockPos: 0xcc64122d,
} as const;

export type UserCommand = {
  tag: (typeof UserCommandTag)[keyof typeof UserCommandTag];
};

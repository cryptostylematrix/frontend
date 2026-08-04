export const SeriesTag = {
  marketing: 0x6a9f7a0f,
  systemPlacesPool: 0xb3d40c57,
  jettonPool: 0xa9f8ef4c,
} as const;

export type Series = {
  tag: (typeof SeriesTag)[keyof typeof SeriesTag];
};

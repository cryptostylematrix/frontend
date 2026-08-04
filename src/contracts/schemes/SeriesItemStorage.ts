import { Address, beginCell } from "@ton/core";
import type { Series } from "./Series";

export type SeriesItemStorage = {
  adminAddress: Address;
  index: number | bigint;
  series: Series;
};

export const seriesItemStorageToCell = (src: SeriesItemStorage) =>
  beginCell()
    .storeAddress(src.adminAddress)
    .storeUint(src.index, 32)
    .storeUint(src.series.tag, 32)
    .endCell();

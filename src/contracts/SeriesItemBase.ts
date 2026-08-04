import {
  Address,
  Cell,
  Contract,
  contractAddress,
} from "@ton/core";
import {
  type SeriesItemStorage,
  seriesItemStorageToCell,
} from "./schemes/SeriesItemStorage";

export class SeriesItemBase implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromConfig(
    config: SeriesItemStorage,
    seriesItemBaseCode: Cell,
    workchain = 0,
  ) {
    const init = {
      code: seriesItemBaseCode,
      data: seriesItemStorageToCell(config),
    };
    return new SeriesItemBase(contractAddress(workchain, init), init);
  }

}

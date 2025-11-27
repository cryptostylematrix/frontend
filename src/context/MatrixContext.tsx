import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "@ton/core";

type MatrixContextType = {
  selectedPlaceId: number | undefined;
  selectedPlaceAddress: Address | undefined;
  rootPlaceId: number | undefined;
  rootPlaceAddress: Address | undefined;
  setSelection: (placeId: number | undefined, addr: Address | undefined) => void;
  setRoot: (placeId: number | undefined, addr: Address | undefined) => void;
  clearAll: () => void;
};

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

export function MatrixProvider({ children }: { children: ReactNode }) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | undefined>(undefined);
  const [selectedPlaceAddress, setSelectedPlaceAddress] = useState<Address | undefined>(undefined);
  const [rootPlaceId, setRootPlaceId] = useState<number | undefined>(undefined);
  const [rootPlaceAddress, setRootPlaceAddress] = useState<Address | undefined>(undefined);

  const setSelection = (placeId: number | undefined, addr: Address | undefined) => {
    setSelectedPlaceId(placeId);
    setSelectedPlaceAddress(addr);
  };

  const setRoot = (placeId: number | undefined, addr: Address | undefined) => {
    setRootPlaceId(placeId);
    setRootPlaceAddress(addr);
  };

  const clearAll = () => {
    setSelectedPlaceId(undefined);
    setSelectedPlaceAddress(undefined);
    setRootPlaceId(undefined);
    setRootPlaceAddress(undefined);
  };

  return (
    <MatrixContext.Provider
      value={{
        selectedPlaceId,
        selectedPlaceAddress,
        rootPlaceId,
        rootPlaceAddress,
        setSelection,
        setRoot,
        clearAll,
      }}>
      {children}
    </MatrixContext.Provider>
  );
}

export function useMatrixContext() {
  const ctx = useContext(MatrixContext);
  if (!ctx) {
    throw new Error("useMatrixContext must be used within MatrixProvider");
  }
  return ctx;
}

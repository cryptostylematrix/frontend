import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type MatrixContextType = {
  selectedMatrix: number;
  setSelectedMatrix: (m: number) => void;
  matrixPrice: number;
  selectedPlaceAddress: string | undefined;
  rootPlaceAddress: string | undefined;
  setSelectedPlace: (addr: string | undefined) => void;
  setRootPlace: (addr: string | undefined) => void;
  resetRooPlacetAndSelectedPlace: () => void;
  resetAll: () => void;
};

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

export function MatrixProvider({ children }: { children: ReactNode }) {
  const [selectedMatrix, setSelectedMatrix] = useState<number>(1);
  const [selectedPlaceAddress, setSelectedPlaceAddress] = useState<string | undefined>(undefined);
  const [rootPlaceAddress, setRootPlaceAddress] = useState<string | undefined>(undefined);
  const matrixPrices: Record<number, number> = {
    1: 15,
    2: 45,
    3: 100,
    4: 240,
    5: 500,
    6: 1200,
  };

  const setSelectedPlace = (addr: string | undefined) => {
    setSelectedPlaceAddress(addr);
  };
  const setRootPlace = (addr: string | undefined) => {
    setRootPlaceAddress(addr);
  };
  const resetRooPlacetAndSelectedPlace = () => {
    setSelectedPlaceAddress(undefined);
    setRootPlaceAddress(undefined);
  };
  const resetAll = () => {
    resetRooPlacetAndSelectedPlace();
    setSelectedMatrix(1);
  };

  return (
    <MatrixContext.Provider
      value={{
        selectedMatrix,
        setSelectedMatrix,
        matrixPrice: matrixPrices[selectedMatrix],
        selectedPlaceAddress,
        rootPlaceAddress,
        setSelectedPlace,
        setRootPlace,
        resetRooPlacetAndSelectedPlace,
        resetAll,
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

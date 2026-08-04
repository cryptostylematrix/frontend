import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMarketingV3Data,
  type MarketingV3CommandConfigResponse,
  type MarketingV3StructureConfigResponse,
} from "../services/contractsApi";
import type { ProgramPlace, ProgramPlaceRef } from "../services/programApi";
import { useProgramContext } from "./ProgramContext";

type StructuresContextValue = {
  selectedStructure: number;
  setSelectedStructure: (structure: number) => void;
  structureOptions: Array<{ value: number; label: string }>;
  commands: Record<string, MarketingV3CommandConfigResponse>;
  firstPlace: ProgramPlace | null;
  selectedPlace: ProgramPlaceRef | null;
  refreshKey: number;
  refreshStructuresPage: () => void;
  setFirstPlace: (place: ProgramPlace | null) => void;
  setSelectedPlace: (place: ProgramPlaceRef | null) => void;
  resetFirstPlaceAndSelectedPlace: () => void;
  resetAll: () => void;
};

const StructuresContext = createContext<StructuresContextValue | undefined>(
  undefined,
);

export function StructuresProvider({ children }: { children: ReactNode }) {
  const { marketingAddress } = useProgramContext();
  const [selectedStructure, setSelectedStructure] = useState(1);
  const [structures, setStructures] = useState<
    Record<string, MarketingV3StructureConfigResponse>
  >({});
  const [firstPlace, setFirstPlace] = useState<ProgramPlace | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<ProgramPlaceRef | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStructures({});

    const loadStructures = async () => {
      const data = await getMarketingV3Data(marketingAddress);
      if (cancelled) return;
      setStructures(data?.structures ?? {});
    };

    void loadStructures();
    return () => {
      cancelled = true;
    };
  }, [marketingAddress]);

  const structureOptions = useMemo(
    () =>
      Object.entries(structures)
        .map(([key, structure]) => ({
          value: Number(key),
          label: structure.name || key,
        }))
        .filter(
          (option) => Number.isFinite(option.value) && option.value !== 0,
        )
        .sort((left, right) => left.value - right.value),
    [structures],
  );

  useEffect(() => {
    if (
      structureOptions.length > 0 &&
      !structureOptions.some((option) => option.value === selectedStructure)
    ) {
      setSelectedStructure(structureOptions[0].value);
    }
  }, [selectedStructure, structureOptions]);

  const commands = useMemo<Record<string, MarketingV3CommandConfigResponse>>(
    () => structures[String(selectedStructure)]?.commands ?? {},
    [selectedStructure, structures],
  );

  const refreshStructuresPage = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const resetFirstPlaceAndSelectedPlace = useCallback(() => {
    setFirstPlace(null);
    setSelectedPlace(null);
  }, []);

  const resetAll = useCallback(() => {
    resetFirstPlaceAndSelectedPlace();
    setSelectedStructure(1);
  }, [resetFirstPlaceAndSelectedPlace]);

  const value = useMemo(
    () => ({
      selectedStructure,
      setSelectedStructure,
      structureOptions,
      commands,
      firstPlace,
      selectedPlace,
      refreshKey,
      refreshStructuresPage,
      setFirstPlace,
      setSelectedPlace,
      resetFirstPlaceAndSelectedPlace,
      resetAll,
    }),
    [
      selectedStructure,
      structureOptions,
      commands,
      firstPlace,
      selectedPlace,
      refreshKey,
      refreshStructuresPage,
      resetFirstPlaceAndSelectedPlace,
      resetAll,
    ],
  );

  return (
    <StructuresContext.Provider value={value}>
      {children}
    </StructuresContext.Provider>
  );
}

export function useStructuresContext() {
  const context = useContext(StructuresContext);
  if (!context) {
    throw new Error("useStructuresContext must be used within StructuresProvider");
  }
  return context;
}

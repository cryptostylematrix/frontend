import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Address } from "@ton/core";
import { MarketingTaskCommandTag } from "../contracts/schemes/MarketingTaskCommand";
import { UserCommandTag } from "../contracts/schemes/UserCommand";
import {
  getMarketingV3Data,
  type MarketingV3TaskResponse,
  type MarketingV3CommandConfigResponse,
  type MarketingV3StructureConfigResponse,
} from "../services/contractsApi";
import {
  getLastPlace,
  type ProgramPlace,
  type ProgramPlaceRef,
} from "../services/programApi";
import { useProfileContext } from "./ProfileContext";
import { useProgramContext } from "./ProgramContext";

const QUEUE_REFRESH_INTERVAL_MS = 5_000;
const PLACE_PURCHASE_COMMANDS = new Set<number>([
  UserCommandTag.buyFirstPlace,
  UserCommandTag.buyPlace,
  UserCommandTag.buyTopPlace,
]);

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
  const { currentProfile } = useProfileContext();
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

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    let initialized = false;
    let previousTaskIds = new Set<string>();
    let previousLastPlaceKey: string | null = null;

    if (!currentProfile || !marketingAddress.trim()) {
      return () => {
        cancelled = true;
      };
    }

    const profileAddress = currentProfile.address;

    const pollQueue = async (initialize = false) => {
      try {
        const [marketingData, lastPlace] = await Promise.all([
          getMarketingV3Data(marketingAddress),
          initialize
            ? getLastPlace(marketingAddress, selectedStructure, profileAddress)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (initialize) previousLastPlaceKey = getPlaceKey(lastPlace);
        if (!marketingData) return;

        const currentTaskIds = new Set(
          Object.entries(marketingData.queue)
            .filter(([, task]) =>
              isPlacePurchaseTask(task, profileAddress, selectedStructure),
            )
            .map(([, task]) => String(task.query_id)),
        );

        if (!initialize) {
          const purchaseTaskDisappeared = [...previousTaskIds].some(
            (taskId) => !currentTaskIds.has(taskId),
          );

          if (purchaseTaskDisappeared) {
            const latestPlace = await getLastPlace(
              marketingAddress,
              selectedStructure,
              profileAddress,
            );
            if (cancelled) return;

            const latestPlaceKey = getPlaceKey(latestPlace);
            if (latestPlace && latestPlaceKey !== previousLastPlaceKey) {
              previousLastPlaceKey = latestPlaceKey;
              setSelectedPlace({
                profile_addr: latestPlace.profile_addr,
                place_number: latestPlace.place_number,
              });
              refreshStructuresPage();
            }
          }
        }

        previousTaskIds = currentTaskIds;
        initialized = true;
      } catch (error) {
        console.error("Failed to synchronize purchased program place", error);
      }
    };

    const pollContinuously = async () => {
      await pollQueue(!initialized);
      if (!cancelled) {
        refreshTimer = window.setTimeout(
          () => void pollContinuously(),
          QUEUE_REFRESH_INTERVAL_MS,
        );
      }
    };

    void pollContinuously();

    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [
    currentProfile,
    marketingAddress,
    refreshStructuresPage,
    selectedStructure,
  ]);

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

function isPlacePurchaseTask(
  task: MarketingV3TaskResponse,
  profileAddress: string,
  structure: number,
): boolean {
  const command = task.command;
  if (
    command?.tag !== MarketingTaskCommandTag.userCommand ||
    !PLACE_PURCHASE_COMMANDS.has(command.command_tag) ||
    !addressesEqual(command.profile_addr, profileAddress)
  ) {
    return false;
  }

  return command.struct === structure || command.command_struct === structure;
}

function addressesEqual(left: string | null, right: string): boolean {
  if (!left) return false;
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return left === right;
  }
}

function getPlaceKey(place: ProgramPlace | null): string | null {
  return place ? `${place.profile_addr ?? ""}:${place.place_number}` : null;
}

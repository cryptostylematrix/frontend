import { createContext, useCallback, useEffect, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getMarketingData } from "../services/contractsApi";
import type { MatrixConfigResponse } from "../services/contractsApi";
import { getRawBuyAmount } from "../services/marketingService";
import { useProfileContext } from "./ProfileContext";
import type { ProfileProgram } from "../services/profileService";

type MarketingContextType = {
  marketingAddr: string;
  program: ProfileProgram;
  selectedMatrix: number;
  setSelectedMatrix: (m: number) => void;
  matrixOptions: Array<{ value: number; label: string }>;
  selectedMatrixConfig: MatrixConfigResponse | undefined;
  matrixPrice: number;
  matrixCurrency: "TON" | "USDT";
  jettonMarketing: boolean;
  selectedPlaceAddress: string | undefined;
  rootPlaceAddress: string | undefined;
  refreshKey: number;
  refreshMatrixPage: () => void;
  setSelectedPlace: (addr: string | undefined) => void;
  setRootPlace: (addr: string | undefined) => void;
  resetRooPlacetAndSelectedPlace: () => void;
  resetAll: () => void;
};

const MarketingContext = createContext<MarketingContextType | undefined>(undefined);

export function MarketingProvider({
  children,
  marketingAddr,
  program,
}: {
  children: ReactNode;
  marketingAddr: string;
  program: ProfileProgram;
}) {
  const { currentProfile } = useProfileContext();
  const normalizedMarketingAddr = useMemo(() => marketingAddr.trim(), [marketingAddr]);
  const [selectedMatrix, setSelectedMatrix] = useState<number>(1);
  const [selectedPlaceAddress, setSelectedPlaceAddress] = useState<string | undefined>(undefined);
  const [rootPlaceAddress, setRootPlaceAddress] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [jettonMarketing, setJettonMarketing] = useState(false);
  const [matrixOptions, setMatrixOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [matrixConfigs, setMatrixConfigs] = useState<Record<string, MatrixConfigResponse>>({});
  const [rawBuyAmount, setRawBuyAmount] = useState<bigint | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!normalizedMarketingAddr) {
      setJettonMarketing(false);
      setMatrixOptions([]);
      setMatrixConfigs({});
      return;
    }

    const load = async () => {
      const data = await getMarketingData(normalizedMarketingAddr);
      if (cancelled) return;
      const nextMatrixOptions = Object.entries(data?.matrixes ?? {})
        .map(([key, matrix]) => ({ value: Number(key), label: matrix.name || key }))
        .filter((matrix) => Number.isFinite(matrix.value))
        .sort((a, b) => a.value - b.value);
      setJettonMarketing(Boolean(data?.jetton_wallet_addr?.trim()));
      setMatrixConfigs(data?.matrixes ?? {});
      setMatrixOptions(nextMatrixOptions);
      if (nextMatrixOptions.length > 0 && !nextMatrixOptions.some((matrix) => matrix.value === selectedMatrix)) {
        setSelectedMatrix(nextMatrixOptions[0].value);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [normalizedMarketingAddr, selectedMatrix]);

  const selectedMatrixConfig = useMemo(
    () => matrixConfigs[String(selectedMatrix)],
    [matrixConfigs, selectedMatrix]
  );

  useEffect(() => {
    let cancelled = false;
    const profileAddr = currentProfile?.address?.trim();
    setRawBuyAmount(null);

    if (!normalizedMarketingAddr || !profileAddr) return () => {
      cancelled = true;
    };

    const load = async () => {
      const amount = await getRawBuyAmount(normalizedMarketingAddr, selectedMatrix, profileAddr);
      if (cancelled) return;
      setRawBuyAmount(amount);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentProfile, normalizedMarketingAddr, refreshKey, selectedMatrix]);

  const matrixPrice = useMemo(() => {
    const amount = rawBuyAmount === null ? 0 : Number(rawBuyAmount);
    return jettonMarketing ? Math.floor(amount / 1_000_000) : amount;
  }, [jettonMarketing, rawBuyAmount]);

  const matrixCurrency = jettonMarketing ? "USDT" : "TON";

  const setSelectedPlace = useCallback((addr: string | undefined) => {
    setSelectedPlaceAddress(addr);
  }, []);
  const setRootPlace = useCallback((addr: string | undefined) => {
    setRootPlaceAddress(addr);
  }, []);
  const refreshMatrixPage = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);
  const resetRooPlacetAndSelectedPlace = useCallback(() => {
    setSelectedPlaceAddress(undefined);
    setRootPlaceAddress(undefined);
  }, []);
  const resetAll = useCallback(() => {
    resetRooPlacetAndSelectedPlace();
    setSelectedMatrix(1);
  }, [resetRooPlacetAndSelectedPlace]);

  return (
    <MarketingContext.Provider
      value={{
        marketingAddr: normalizedMarketingAddr,
        program,
        selectedMatrix,
        setSelectedMatrix,
        matrixOptions,
        selectedMatrixConfig,
        matrixPrice,
        matrixCurrency,
        jettonMarketing,
        selectedPlaceAddress,
        rootPlaceAddress,
        refreshKey,
        refreshMatrixPage,
        setSelectedPlace,
        setRootPlace,
        resetRooPlacetAndSelectedPlace,
        resetAll,
      }}>
      {children}
    </MarketingContext.Provider>
  );
}

export function useMarketingContext() {
  const ctx = useContext(MarketingContext);
  if (!ctx) {
    throw new Error("useMarketingContext must be used within MarketingProvider");
  }
  return ctx;
}

import { useEffect, useState } from "react";
import {
  getJettonMetadata,
  type JettonMetadata,
} from "../services/jettonMetadataService";

export function useJettonMetadata(jettonWalletAddress?: string | null) {
  const [metadata, setMetadata] = useState<JettonMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const address = jettonWalletAddress?.trim();
    setMetadata(null);

    if (!address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void getJettonMetadata(address)
      .then((response) => {
        if (!cancelled) setMetadata(response);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jettonWalletAddress]);

  return { metadata, isLoading };
}

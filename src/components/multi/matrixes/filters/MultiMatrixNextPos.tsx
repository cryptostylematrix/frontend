import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-nextpos.css";
import type { Profile } from "../../../../utils/profileStorage";
import { getNextPos } from "../../../../services/matrixService";
import type { Address } from "@ton/core";

interface Props {
  matrixId: number;
  currentProfile?: Profile | null;
  onSelect?: (id: number, addr: Address) => void;
}

export default function NextPosButton({ matrixId, currentProfile, onSelect }: Props) {
  const { t } = useTranslation();
  const [nextPos, setNextPos] = useState<{ id: number; address: Address } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProfile) {
      setNextPos(null);
      return;
    }
    setLoading(true);
    getNextPos(matrixId, currentProfile)
      .then((next) => {
        setNextPos(next ? { id: next.place_number, address: next.address } : null);
      })
      .finally(() => setLoading(false));
  }, [matrixId, currentProfile]);

  return (
    <button
      type="button"
      className="next-pos-button"
      onClick={() => {
        if (!nextPos || !onSelect) return;
        onSelect(nextPos.id, nextPos.address);
      }}
      disabled={!nextPos || loading}
    >
      {loading ? t("home.loading") : t("multiMatrix.filters.nextPos", "Next pos")}
    </button>
  );
}

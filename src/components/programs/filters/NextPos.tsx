import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import {
  getNextPos,
  type NextPosResponse,
} from "../../../services/programApi";
import "./next-pos.css";

export default function NextPos() {
  const { currentProfile } = useProfileContext();
  const { t } = useTranslation();
  const { marketingAddress } = useProgramContext();
  const {
    refreshKey,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();
  const [nextPos, setNextPos] = useState<NextPosResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const profileAddress = currentProfile?.address;

    if (!profileAddress || !marketingAddress) {
      setNextPos(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void getNextPos(
      marketingAddress,
      selectedStructure,
      profileAddress,
    )
      .then((next) => {
        if (!cancelled) setNextPos(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  return (
    <button
      type="button"
      className="filter-button secondary update-page-button"
      onClick={() => {
        if (!nextPos) return;
        setSelectedPlace({
          profile_addr: nextPos.profile_addr,
          place_number: nextPos.place_number,
        });
      }}
      disabled={!nextPos || loading}
    >
      {loading ? t("home.loading") : t("structure.nextPos", "Next pos")}
    </button>
  );
}

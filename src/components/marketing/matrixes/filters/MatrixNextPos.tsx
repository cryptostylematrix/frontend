import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNextPos } from "../../../../services/marketingApi";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { useProfileContext } from "../../../../context/ProfileContext";


export default function MatrixNextPos() {
  const { currentProfile } = useProfileContext();
  const { t } = useTranslation();
  const { marketingAddr, refreshKey, setSelectedPlace, selectedMatrix } = useMarketingContext();
  const [nextPos, setNextPos] = useState<{ parent_addr: string; pos: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProfile || !marketingAddr) {
      setNextPos(null);
      return;
    }
    setLoading(true);
    getNextPos(marketingAddr, selectedMatrix, currentProfile.address)
      .then((next) => {
        setNextPos(next ? { parent_addr: next.parent_addr, pos: next.pos } : null);
      })
      .finally(() => setLoading(false));
  }, [marketingAddr, selectedMatrix, currentProfile, refreshKey]);

  return (
    <button
      type="button"
      className="filter-button secondary update-page-button"
      onClick={() => {
        if (!nextPos) return;
        setSelectedPlace(nextPos.parent_addr);
      }}
      disabled={!nextPos || loading}
    >
      {loading ? t("home.loading") : t("neoMatrix.filters.nextPos", "Next pos")}
    </button>
  );
}

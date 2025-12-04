import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNextPos } from "../../../../services/matrixService";
import { useMatrixContext } from "../../../../context/MatrixContext";
import { useProfileContext } from "../../../../context/ProfileContext";


export default function NextPosButton() {
  const { currentProfile } = useProfileContext();
  const { t } = useTranslation();
  const { setSelectedPlace, selectedMatrix } = useMatrixContext();
  const [nextPos, setNextPos] = useState<{ address: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProfile) {
      setNextPos(null);
      return;
    }
    setLoading(true);
    getNextPos(selectedMatrix, currentProfile.address)
      .then((next) => {
        setNextPos(next ? { address: next.address } : null);
      })
      .finally(() => setLoading(false));
  }, [selectedMatrix, currentProfile]);

  return (
    <button
      type="button"
      className="filter-button secondary update-page-button"
      onClick={() => {
        if (!nextPos) return;
        setSelectedPlace(nextPos.address);
      }}
      disabled={!nextPos || loading}
    >
      {loading ? t("home.loading") : t("multiMatrix.filters.nextPos", "Next pos")}
    </button>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-filters.css";
import MultiMatrixFilterPlaces from "./MultiMatrixFilterPlaces";
import MultiMatrixFilterLocks from "./MultiMatrixFilterLocks";
import MultiMatrixFilterSearch from "./MultiMatrixFilterSearch";
import NextPosButton from "./MultiMatrixNextPos";
import { useProfileContext } from "../../../../context/ProfileContext";
import { buyPlace } from "../../../../services/multiService";
import { translateError } from "../../../../errors/errorUtils";
import "../../../../pages/profile/update-profile.css";
import { useMatrixContext } from "../../../../context/MatrixContext";
import { getRootPlace, getPlacesCount } from "../../../../services/fakeMatrixService";
import { getProfileProgramData } from "../../../../services/profileService";
import { Programs } from "../../../../contracts/MultiConstants";

export default function MultiMatrixFilters() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const {
    resetRooPlacetAndSelectedPlace,
    resetAll,
    setRootPlace,
    selectedMatrix,
    setSelectedMatrix,
    matrixPrice,
  } = useMatrixContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [buyStatus, setBuyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    resetAll();
  }, [currentProfile]);

  useEffect(() => {
    resetRooPlacetAndSelectedPlace();
    if (!currentProfile) return;

    const run = async () => {
      getRootPlace(selectedMatrix, currentProfile.address).then((root) => {
        setRootPlace(root?.address);
      });
    };

    run();

  }, [selectedMatrix, currentProfile]);

  const buyPlaceLabel = t("multiMatrix.filters.buyPlace", {
    price: matrixPrice,
    defaultValue: `Buy new place (${matrixPrice} TON)`,
  });

  const handleBuy = async () => {
    if (!currentProfile) return;
    if (!window.confirm(t("multiMatrix.filters.confirmBuy", "Are you sure?"))) return;

    setBuyLoading(true);
    setBuyStatus(null);

    if (selectedMatrix === 1) {
      const program = await getProfileProgramData(currentProfile.address, Programs.multi);
      if (!program.success || !program.data || !program.data.confirmed) {
        setBuyLoading(false);
        alert(t("multiMatrix.filters.programNotConfirmed", "You need to choose an inviter first."));
        return;
      }
    }

    if (selectedMatrix > 1) {
      const prevCount = await getPlacesCount(selectedMatrix - 1, currentProfile.address);
      if (prevCount <= 0) {
        setBuyLoading(false);
        alert(t("multiMatrix.filters.prevMatrixRequired", "You need a place in the previous matrix before buying here."));
        return;
      }
    }

    const result = await buyPlace(Date.now(), selectedMatrix, currentProfile.address, undefined);
    if (result.success) {
      setBuyStatus({
        type: "success",
        message: t("multiMatrix.filters.buySuccess", "New place will appear on places list soon."),
      });
    } else {
      const code = result.error_code;
      setBuyStatus({
        type: "error",
        message: code ? translateError(t, code) : t("multiMatrix.filters.buyFail", "Fail"),
      });
    }

    setBuyLoading(false);
  };

  return (
    <div className="matrix-row matrix-row--filters">
      <div className="filters-toggle-bar">
        <span className="filters-toggle-label">
          {t("multiMatrix.filters.title", "Filters")}
        </span>
        <button
          type="button"
          className="filters-toggle-button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-controls="filters-body"
        >
          {isCollapsed
            ? t("multiMatrix.filters.show", "Show")
            : t("multiMatrix.filters.hide", "Hide")}
        </button>
      </div>

      <div
        id="filters-body"
        className={`filters-body ${isCollapsed ? "is-collapsed" : ""}`}
      >
        <div className="filters-grid">
        <label className="filter-field">
          <span className="filter-label">
            {t("multiMatrix.filters.matrixes", "Matrixes")}
          </span>
          <select
            className="filter-select"
            name="matrixes"
            value={selectedMatrix}
            onChange={(e) => {
              setSelectedMatrix(Number(e.target.value));
              e.currentTarget.blur();
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <MultiMatrixFilterPlaces />

        <MultiMatrixFilterSearch />

        <MultiMatrixFilterLocks />
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="filter-button primary"
            onClick={handleBuy}
            disabled={buyLoading}
          >
            {buyLoading ? t("home.loading") : buyPlaceLabel}
          </button>
          <NextPosButton />
          {buyStatus && (
            <div className="buy-status-row">
              <div className={`op-message ${buyStatus.type}`} role="status">
                {buyStatus.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

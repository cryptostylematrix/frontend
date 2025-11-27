import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-filters.css";
import MultiMatrixFilterPlaces from "./MultiMatrixFilterPlaces";
import MultiMatrixFilterLocks from "./MultiMatrixFilterLocks";
import MultiMatrixFilterSearch from "./MultiMatrixFilterSearch";
import NextPosButton from "./MultiMatrixNextPos";
import { useProfileContext } from "../../../../context/ProfileContext";
import { buyPlace, getRootPlace } from "../../../../services/matrixService";
import { translateError } from "../../../../errors/errorUtils";
import "../../../../pages/profile/update-profile.css";
import { useMatrixContext } from "../../../../context/MatrixContext";


const matrixPrices: Record<number, number> = {
  1: 15,
  2: 45,
  3: 100,
  4: 240,
  5: 500,
  6: 1200,
};

export default function MultiMatrixFilters() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { clearAll, setRoot, setSelection } = useMatrixContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected_m, setSelectedMatrix] = useState<number>(1);
  const [buyStatus, setBuyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    setSelectedMatrix(1);
    clearAll();
  }, [currentProfile]);

  useEffect(() => {
    clearAll();
    if (!currentProfile) return;

    getRootPlace(selected_m, currentProfile).then((root) => {
      setRoot(root?.place_number, root?.address);
    });

  }, [selected_m, currentProfile]);

  const buyPlaceLabel = t("multiMatrix.filters.buyPlace", {
    price: matrixPrices[selected_m],
    defaultValue: `Buy new place (${matrixPrices[selected_m]} TON)`,
  });

  const handleBuy = async () => {
    if (!currentProfile) return;
    if (!window.confirm(t("multiMatrix.filters.confirmBuy", "Are you sure?"))) return;

    setBuyLoading(true);
    setBuyStatus(null);

    const result = await buyPlace(selected_m, currentProfile!);
    if (result.success) {
      setBuyStatus({
        type: "success",
        message: t("multiMatrix.filters.buySuccess", "New place will appear on places list soon."),
      });
    } else {
      const code = result.errors?.[0];
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
            value={selected_m}
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

        <MultiMatrixFilterPlaces matrixId={selected_m} />

        <MultiMatrixFilterSearch matrixId={selected_m} />

        <MultiMatrixFilterLocks matrixId={selected_m} />
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
          <NextPosButton
            matrixId={selected_m}
            currentProfile={currentProfile}
            onSelect={(id, addr) => setSelection(id, addr)}
          />
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

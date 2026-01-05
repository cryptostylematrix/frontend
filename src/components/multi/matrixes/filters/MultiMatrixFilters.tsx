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
import { getRootPlace, getPlacesCount } from "../../../../services/matrixApi";
import { getProfilePrograms } from "../../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import ConfirmDialog from "../../../common/ConfirmDialog";

export default function MultiMatrixFilters() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const [tonConnectUI] = useTonConnectUI();
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
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);

  useEffect(() => {
    resetAll();
  }, [currentProfile]);

  useEffect(() => {
    resetRooPlacetAndSelectedPlace();
    if (!currentProfile) return;

    const run = async () => {
      getRootPlace(selectedMatrix, currentProfile.address).then((root) => {
        setRootPlace(root?.addr);
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

    setBuyLoading(true);
    setBuyStatus(null);

    try {
      if (selectedMatrix === 1) {
        const program = await getProfilePrograms(currentProfile.address);
        if (!program?.multi || program.multi.confirmed !== 1) {
          setBuyStatus({
            type: "error",
            message: t("multiMatrix.filters.programNotConfirmed", "You need to choose an inviter first."),
          });
          return;
        }
      }

      if (selectedMatrix > 1) {
        const prevCount = await getPlacesCount(selectedMatrix - 1, currentProfile.address);
        if (prevCount <= 0) {
          setBuyStatus({
            type: "error",
            message: t(
              "multiMatrix.filters.prevMatrixRequired",
              "You need a place in the previous matrix before buying here."
            ),
          });
          return;
        }
      }

      const result = await buyPlace(tonConnectUI, selectedMatrix, currentProfile.address, null);
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
    } finally {
      setBuyLoading(false);
    }
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
            onClick={() => {
              if (currentProfile) setShowBuyConfirm(true);
            }}
            disabled={buyLoading}
          >
            {buyLoading ? t("home.loading") : buyPlaceLabel}
          </button>
          <NextPosButton />
          <button
            type="button"
            className="filter-button secondary next-pos-style"
            onClick={() => window.location.reload()}
          >
            {t("multiMatrix.filters.updatePage", "Update page")}
          </button>
          {buyStatus && (
            <div className="buy-status-row">
              <div className={`op-message ${buyStatus.type}`} role="status">
                {buyStatus.message}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showBuyConfirm}
        title={t("multiMatrix.filters.confirmTitle", "Confirm purchase")}
        message={t("multiMatrix.filters.confirmBuy", "Are you sure?")}
        confirmLabel={t("multiMatrix.filters.buyPlace", { defaultValue: "Buy", price: matrixPrice })}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setShowBuyConfirm(false)}
        onConfirm={() => {
          setShowBuyConfirm(false);
          handleBuy();
        }}
      />
    </div>
  );
}

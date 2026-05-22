import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./matrix-filters.css";
import MatrixFilterPlaces from "./MatrixFilterPlaces";
import MatrixFilterLocks from "./MatrixFilterLocks";
import MatrixFilterSearch from "./MatrixFilterSearch";
import MatrixNextPos from "./MatrixNextPos";
import { useProfileContext } from "../../../../context/ProfileContext";
import { WalletContext } from "../../../../App";
import { buyPlaceByJetton, buyPlaceByTon } from "../../../../services/marketingService";
import { translateError } from "../../../../errors/errorUtils";
import "../../../../pages/profile/update-profile.css";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { getRootPlace } from "../../../../services/marketingApi";
import { getProfileProgram } from "../../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import ConfirmDialog from "../../../common/ConfirmDialog";

export default function MatrixFilters() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { wallet } = useContext(WalletContext)!;
  const [tonConnectUI] = useTonConnectUI();
  const {
    marketingAddr,
    resetRooPlacetAndSelectedPlace,
    resetAll,
    setRootPlace,
    refreshKey,
    refreshMatrixPage,
    selectedMatrix,
    setSelectedMatrix,
    matrixOptions,
    matrixPrice,
    matrixCurrency,
    jettonMarketing,
    program,
  } = useMarketingContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [buyStatus, setBuyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);

  useEffect(() => {
    resetAll();
  }, [currentProfile]);

  useEffect(() => {
    resetRooPlacetAndSelectedPlace();
  }, [selectedMatrix, currentProfile]);

  useEffect(() => {
    if (!currentProfile || !marketingAddr) return;

    const run = async () => {
      getRootPlace(marketingAddr, selectedMatrix, currentProfile.address).then((root) => {
        setRootPlace(root?.addr);
      });
    };

    run();

  }, [marketingAddr, selectedMatrix, currentProfile, refreshKey, setRootPlace]);

  const buyPlaceLabel = t("matrix.filters.buyPlace", {
    price: matrixPrice,
    currency: matrixCurrency,
    defaultValue: `Buy new place (${matrixPrice} ${matrixCurrency})`,
  });
  const confirmBuyMessage = (
    <>
      <p>{t("matrix.filters.confirmBuy", "Are you sure?")}</p>
      <p>
        {t("matrix.filters.profileLabel", "Profile")}: <strong>{currentProfile?.login ?? ""}</strong>
      </p>
    </>
  );

  const handleBuy = async () => {
    if (!currentProfile) return;

    setBuyLoading(true);
    setBuyStatus(null);

    try {
      const programData = await getProfileProgram(currentProfile.address, program);
      if (!programData || programData.confirmed !== 1) {
        setBuyStatus({
          type: "error",
          message: t("matrix.filters.programNotConfirmed", "You need to choose an inviter first."),
        });
        return;
      }

      const result = jettonMarketing
        ? await buyPlaceByJetton(tonConnectUI, marketingAddr, selectedMatrix, currentProfile.address, wallet, null)
        : await buyPlaceByTon(tonConnectUI, marketingAddr, selectedMatrix, currentProfile.address, null);
      if (result.success) {
        setBuyStatus({
          type: "success",
          message: t("matrix.filters.buySuccess", "New place will appear on places list soon."),
        });
      } else {
        const code = result.error_code;
        setBuyStatus({
          type: "error",
          message: code ? translateError(t, code) : t("matrix.filters.buyFail", "Fail"),
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
          {t("matrix.filters.title", "Filters")}
        </span>
        <button
          type="button"
          className="filters-toggle-button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-controls="filters-body"
        >
          {isCollapsed
            ? t("matrix.filters.show", "Show")
            : t("matrix.filters.hide", "Hide")}
        </button>
      </div>

      <div
        id="filters-body"
        className={`filters-body ${isCollapsed ? "is-collapsed" : ""}`}
      >
        <div className="filters-grid">
        <label className="filter-field">
          <span className="filter-label">
            {t("matrix.filters.matrixes", "Matrixes")}
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
            {matrixOptions.map((matrix) => (
              <option key={matrix.value} value={matrix.value}>
                {matrix.label}
              </option>
            ))}
          </select>
        </label>

        <MatrixFilterPlaces />

        <MatrixFilterSearch />

        <MatrixFilterLocks />
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
          <MatrixNextPos />
          <button
            type="button"
            className="filter-button secondary next-pos-style"
            onClick={refreshMatrixPage}
          >
            {t("matrix.filters.updatePage", "Update page")}
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
        title={t("matrix.filters.confirmTitle", "Confirm purchase")}
        message={confirmBuyMessage}
        confirmLabel={buyPlaceLabel}
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

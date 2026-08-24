import { useContext, useEffect, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { fromNano } from "@ton/core";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../../App";
import { UserCommandTag } from "../../../contracts/schemes/UserCommand";
import ConfirmDialog from "../../common/ConfirmDialog";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import { translateError } from "../../../errors/errorUtils";
import { useJettonMetadata } from "../../../hooks/useJettonMetadata";
import {
  getFirstPlace,
  getPurchaseOption,
  getStructure,
  type PurchaseOption,
} from "../../../services/programApi";
import {
  buyPlaceByJetton,
  buyPlaceByTon,
} from "../../../services/programStructuresService";
import { formatJettonAmount } from "../../../services/jettonMetadataService";
import Locks from "./Locks";
import NextPos from "./NextPos";
import PlaceSearch from "./PlaceSearch";
import Places from "./Places";
import "../../../pages/profile/update-profile.css";
import "./filters.css";

export default function Filters() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { wallet } = useContext(WalletContext)!;
  const [tonConnectUI] = useTonConnectUI();
  const { marketingAddress } = useProgramContext();
  const {
    resetFirstPlaceAndSelectedPlace,
    resetAll,
    setFirstPlace,
    notifyPlacePurchaseSubmitted,
    refreshKey,
    refreshStructuresPage,
    selectedStructure,
    setSelectedStructure,
    structureOptions,
    commands,
  } = useStructuresContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [buyStatus, setBuyStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [purchaseOption, setPurchaseOption] =
    useState<PurchaseOption | null>(null);
  const [usesMatrixTerminology, setUsesMatrixTerminology] = useState(false);

  useEffect(() => {
    resetAll();
  }, [currentProfile, resetAll]);

  useEffect(() => {
    let cancelled = false;
    setUsesMatrixTerminology(false);

    void getStructure(marketingAddress, selectedStructure).then((structure) => {
      if (!cancelled) {
        setUsesMatrixTerminology(
          (structure?.width ?? 0) > 0 && (structure?.height ?? 0) > 0,
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [marketingAddress, selectedStructure]);

  useEffect(() => {
    resetFirstPlaceAndSelectedPlace();
  }, [
    currentProfile,
    resetFirstPlaceAndSelectedPlace,
    selectedStructure,
  ]);

  useEffect(() => {
    setBuyStatus(null);
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (!currentProfile || !marketingAddress) return;

    void getFirstPlace(
      marketingAddress,
      selectedStructure,
      currentProfile.address,
    ).then((place) => {
      if (!cancelled) setFirstPlace(place);
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentProfile,
    marketingAddress,
    refreshKey,
    selectedStructure,
    setFirstPlace,
  ]);

  useEffect(() => {
    let cancelled = false;
    setPurchaseOption(null);
    setShowBuyConfirm(false);

    if (!currentProfile || !marketingAddress) return;

    void getPurchaseOption(
      marketingAddress,
      selectedStructure,
      currentProfile.address,
    ).then((option) => {
      if (!cancelled) setPurchaseOption(option);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  const buyCommand =
    purchaseOption?.can_buy && purchaseOption.command_tag !== null
      ? commands[String(purchaseOption.command_tag)]
      : undefined;
  const supportsLocks = Boolean(
    commands[String(UserCommandTag.lockPos)] ||
      commands[String(UserCommandTag.unlockPos)],
  );
  const usesJetton = Boolean(buyCommand?.sender_jetton_wallet?.trim());
  const { metadata: jettonMetadata, isLoading: jettonMetadataLoading } =
    useJettonMetadata(buyCommand?.sender_jetton_wallet);
  const commandPrice = buyCommand?.price ?? 0;
  const displayedCommandPrice = usesJetton
    ? jettonMetadata
      ? formatJettonAmount(commandPrice, jettonMetadata.decimals)
      : "—"
    : fromNano(commandPrice);
  const commandCurrency = usesJetton
    ? jettonMetadata?.symbol ?? "JETTON"
    : "TON";

  const buyPlaceLabel = t("structure.buyPlace", {
    price: displayedCommandPrice,
    currency: commandCurrency,
    defaultValue: `Buy new place (${displayedCommandPrice} ${commandCurrency})`,
  });

  const handleBuy = async () => {
    if (!currentProfile || !buyCommand) return;

    setBuyLoading(true);
    setBuyStatus(null);
    try {
      const result = usesJetton
        ? await buyPlaceByJetton(
            tonConnectUI,
            marketingAddress,
            selectedStructure,
            currentProfile.address,
            wallet,
            null,
          )
        : await buyPlaceByTon(
            tonConnectUI,
            marketingAddress,
            selectedStructure,
            currentProfile.address,
            null,
          );

      setBuyStatus(
        result.success
          ? {
              type: "success",
              message: t(
                "structure.buySuccess",
                "New place will appear on places list soon.",
              ),
            }
          : {
              type: "error",
              message: translateError(t, result.error_code),
            },
      );
      if (result.success) notifyPlacePurchaseSubmitted();
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="matrix-row matrix-row--filters">
      <div className="filters-toggle-bar">
        <span className="filters-toggle-label">
          {t("structure.filtersTitle", "Filters")}
        </span>
        <button
          type="button"
          className="filters-toggle-button"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-expanded={!isCollapsed}
          aria-controls="program-filters-body"
        >
          {isCollapsed
            ? t("structure.show", "Show")
            : t("structure.hide", "Hide")}
        </button>
      </div>

      <div
        id="program-filters-body"
        className={`filters-body ${isCollapsed ? "is-collapsed" : ""}`}
      >
        <div className="filters-grid">
          <label className="filter-field">
            <span className="filter-label">
              {usesMatrixTerminology
                ? t("structure.matrixes", "Matrices")
                : t("structure.structures", "Levels")}
            </span>
            <select
              className="filter-select"
              name="structures"
              value={selectedStructure}
              onChange={(event) => {
                setSelectedStructure(Number(event.target.value));
                event.currentTarget.blur();
              }}
            >
              {structureOptions.map((structure) => (
                <option key={structure.value} value={structure.value}>
                  {structure.label}
                </option>
              ))}
            </select>
          </label>

          <Places isMatrixStructure={usesMatrixTerminology} />
          <PlaceSearch />
          {supportsLocks && <Locks />}
        </div>

        <div className="filter-actions">
          {buyCommand && (
            <button
              type="button"
              className="filter-button primary"
              onClick={() => currentProfile && setShowBuyConfirm(true)}
              disabled={buyLoading || jettonMetadataLoading}
            >
              {buyLoading || jettonMetadataLoading
                ? t("home.loading")
                : buyPlaceLabel}
            </button>
          )}
          <NextPos />
          <button
            type="button"
            className="filter-button secondary next-pos-style"
            onClick={refreshStructuresPage}
          >
            {t("structure.updatePage", "Update page")}
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
        title={t("structure.confirmTitle", "Confirm purchase")}
        message={
          <>
            <p>{t("structure.confirmBuy", "Are you sure?")}</p>
            <p>
              {t("structure.profileLabel", "Profile")}: {" "}
              <strong>{currentProfile?.login ?? ""}</strong>
            </p>
            {(currentProfile?.mode === "preview" || currentProfile?.owned === false) && (
              <p className="confirm-modal__warning">
                {t("structure.previewPurchaseWarning", {
                  login: currentProfile.login,
                  defaultValue:
                    "Attention: this profile belongs to another wallet. You are buying a place for the foreign profile {{login}}.",
                })}
              </p>
            )}
          </>
        }
        confirmLabel={buyPlaceLabel}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setShowBuyConfirm(false)}
        onConfirm={() => {
          setShowBuyConfirm(false);
          void handleBuy();
        }}
      />
    </div>
  );
}

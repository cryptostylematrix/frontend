import { useContext, useEffect, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../../App";
import { UserCommandTag } from "../../../contracts/schemes/UserCommand";
import ConfirmDialog from "../../common/ConfirmDialog";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import { translateError } from "../../../errors/errorUtils";
import {
  getFirstPlace,
  getPlacesCount,
  getStructure,
} from "../../../services/programApi";
import {
  buyPlaceByJetton,
  buyPlaceByTon,
} from "../../../services/programStructuresService";
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
  const [isPlaceLimitReached, setIsPlaceLimitReached] = useState(false);

  useEffect(() => {
    resetAll();
  }, [currentProfile, resetAll]);

  useEffect(() => {
    resetFirstPlaceAndSelectedPlace();
  }, [
    currentProfile,
    resetFirstPlaceAndSelectedPlace,
    selectedStructure,
  ]);

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
    setIsPlaceLimitReached(false);

    if (!currentProfile || !marketingAddress) return;

    void Promise.all([
      getStructure(marketingAddress, selectedStructure),
      getPlacesCount(
        marketingAddress,
        selectedStructure,
        currentProfile.address,
      ),
    ]).then(([structure, placesCount]) => {
      if (cancelled || !structure || !placesCount) return;

      const limitReached =
        placesCount.count >= structure.max_places_per_profile;
      setIsPlaceLimitReached(limitReached);
      if (limitReached) setShowBuyConfirm(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  const buyFirstPlaceCommand = commands[String(UserCommandTag.buyFirstPlace)];
  const buyPlaceCommand = commands[String(UserCommandTag.buyPlace)];
  const buyCommand =
    buyFirstPlaceCommand && !buyPlaceCommand
      ? buyFirstPlaceCommand
      : buyPlaceCommand;
  const usesJetton = Boolean(buyCommand?.sender_jetton_wallet?.trim());
  const commandPrice = buyCommand?.price ?? 0;
  const displayedCommandPrice = usesJetton
    ? commandPrice / 1_000_000
    : commandPrice;
  const commandCurrency = usesJetton ? "USDT" : "TON";

  const buyPlaceLabel = t("structure.buyPlace", {
    price: displayedCommandPrice,
    currency: commandCurrency,
    defaultValue: `Buy new place (${displayedCommandPrice} ${commandCurrency})`,
  });

  const handleBuy = async () => {
    if (!currentProfile || isPlaceLimitReached) return;

    setBuyLoading(true);
    setBuyStatus(null);
    try {
      if (!buyCommand) return;

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
              {t("structure.structures", "Structures")}
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

          <Places />
          <PlaceSearch />
          <Locks />
        </div>

        <div className="filter-actions">
          {!isPlaceLimitReached && (
            <button
              type="button"
              className="filter-button primary"
              onClick={() => currentProfile && setShowBuyConfirm(true)}
              disabled={buyLoading || !buyCommand}
            >
              {buyLoading ? t("home.loading") : buyPlaceLabel}
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

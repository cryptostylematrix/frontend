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
import { useJettonMetadata } from "../../../hooks/useJettonMetadata";
import {
  getFirstPlace,
  getTopPlace,
  getPlacesCount,
  getStructure,
} from "../../../services/programApi";
import {
  buyPlaceByJetton,
  buyPlaceByTon,
  selectBuyCommand,
} from "../../../services/programStructuresService";
import type { ProgramStructure } from "../../../services/programApi";
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
  const [placesCount, setPlacesCount] = useState<number | null>(null);
  const [structureConfig, setStructureConfig] =
    useState<ProgramStructure | null>(null);
  const [placeSearchProfileAddress, setPlaceSearchProfileAddress] = useState<
    string | null
  >(null);

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
    setPlacesCount(null);
    setStructureConfig(null);
    setPlaceSearchProfileAddress(null);
    setShowBuyConfirm(false);

    if (!currentProfile || !marketingAddress) return;

    const loadFilterData = async () => {
      const [structure, placesCount] = await Promise.all([
        getStructure(marketingAddress, selectedStructure),
        getPlacesCount(
          marketingAddress,
          selectedStructure,
          currentProfile.address,
        ),
      ]);
      if (cancelled) return;

      if (placesCount) setPlacesCount(placesCount.count);
      if (!structure) return;

      setStructureConfig(structure);
      if (structure.pos_algo.root === "owner") {
        const topPlace = await getTopPlace(marketingAddress, selectedStructure);
        if (cancelled) return;
        setPlaceSearchProfileAddress(topPlace?.profile_addr ?? null);
      } else {
        setPlaceSearchProfileAddress(currentProfile.address);
      }

      if (
        placesCount &&
        placesCount.count >= structure.max_places_per_profile
      ) {
        setShowBuyConfirm(false);
      }
    };

    void loadFilterData();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  const selectedBuyCommand = selectBuyCommand(
    commands,
    placesCount,
    structureConfig?.max_places_per_profile ?? null,
  );
  const buyCommand = selectedBuyCommand?.config;
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
    : commandPrice;
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
              {t("structure.structures", "Levels")}
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
          <PlaceSearch rootProfileAddress={placeSearchProfileAddress} />
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
          {structureConfig?.pos_algo.root === "profile" && <NextPos />}
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

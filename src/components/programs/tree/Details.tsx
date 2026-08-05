import { useContext, useEffect, useMemo, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../../App";
import ConfirmDialog from "../../common/ConfirmDialog";
import { UserCommandTag } from "../../../contracts/schemes/UserCommand";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import { translateError } from "../../../errors/errorUtils";
import { useJettonMetadata } from "../../../hooks/useJettonMetadata";
import { getProfileNftData } from "../../../services/contractsApi";
import {
  getLocks,
  getPlacesCount,
  type ProgramStructure,
  type ProgramTreeNode,
} from "../../../services/programApi";
import {
  buyPlaceByJetton,
  buyPlaceByTon,
  executePositionCommand,
  selectBuyCommand,
  type PlacePosData,
} from "../../../services/programStructuresService";
import { formatJettonAmount } from "../../../services/jettonMetadataService";
import "../../../pages/profile/update-profile.css";
import "./details.css";

const formatter = new Intl.NumberFormat("en-US");

type DetailsProps = {
  selectedNode: ProgramTreeNode | null;
  structure: ProgramStructure | null;
};

export default function Details({ selectedNode, structure }: DetailsProps) {
  const { currentProfile } = useProfileContext();
  const { wallet } = useContext(WalletContext)!;
  const [tonConnectUI] = useTonConnectUI();
  const { t } = useTranslation();
  const { marketingAddress } = useProgramContext();
  const {
    commands,
    refreshKey,
    selectedPlace,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();
  const [buyLoading, setBuyLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [positionLocked, setPositionLocked] = useState<boolean | null>(null);
  const [placesCount, setPlacesCount] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "buy" | "lock" | "unlock" | null
  >(null);

  const isFilled = selectedNode?.node_type === "filled";
  const selectedBuyCommand = selectBuyCommand(
    commands,
    placesCount,
    structure?.max_places_per_profile ?? null,
  );
  const buyCommand = selectedBuyCommand?.config;
  const lockCommand = commands[String(UserCommandTag.lockPos)];
  const unlockCommand = commands[String(UserCommandTag.unlockPos)];
  const supportsLocks = Boolean(lockCommand || unlockCommand);
  const usesJetton = Boolean(buyCommand?.sender_jetton_wallet?.trim());
  const { metadata: jettonMetadata, isLoading: jettonMetadataLoading } =
    useJettonMetadata(buyCommand?.sender_jetton_wallet);
  const rawPrice = buyCommand?.price ?? 0;
  const displayedPrice = usesJetton
    ? jettonMetadata
      ? formatJettonAmount(rawPrice, jettonMetadata.decimals)
      : "—"
    : rawPrice;
  const currency = usesJetton ? jettonMetadata?.symbol ?? "JETTON" : "TON";
  const ownerRootPositioning = structure?.pos_algo.root === "owner";

  useEffect(() => {
    let cancelled = false;
    setPlacesCount(null);

    const profileAddress = currentProfile?.address;
    if (!profileAddress || !marketingAddress) return;

    void getPlacesCount(
      marketingAddress,
      selectedStructure,
      profileAddress,
    ).then((response) => {
      if (!cancelled) setPlacesCount(response?.count ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  useEffect(() => {
    let cancelled = false;
    setImageUrl("");
    setImageFailed(false);

    if (!selectedNode || selectedNode.node_type !== "filled") return;
    const profileAddress = selectedNode.profile_addr?.trim();
    if (!profileAddress) return;

    void getProfileNftData(profileAddress).then((profile) => {
      if (!cancelled) setImageUrl(profile?.content?.image_url ?? "");
    });

    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  useEffect(() => {
    setDetailsStatus(null);
    setConfirmAction(null);
  }, [selectedNode]);

  const fixedPos = useMemo<PlacePosData | null>(() => {
    if (
      !selectedNode ||
      selectedNode.node_type !== "empty" ||
      selectedNode.parent_place_number === null
    ) {
      return null;
    }

    return {
      parent: {
        struct: selectedStructure,
        profile_addr: selectedNode.parent_profile_addr,
        place_number: selectedNode.parent_place_number,
      },
      pos: selectedNode.pos,
    };
  }, [selectedNode, selectedStructure]);

  useEffect(() => {
    let cancelled = false;
    setPositionLocked(null);

    const profileAddress = currentProfile?.address;
    if (!profileAddress || !marketingAddress || !fixedPos || !supportsLocks) {
      return;
    }

    const loadLockState = async () => {
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await getLocks(
          marketingAddress,
          selectedStructure,
          profileAddress,
          page,
          pageSize,
        );
        if (cancelled) return;
        if (!response) {
          setPositionLocked(false);
          return;
        }

        const found = response.items.some(
          (lock) =>
            lock.place_profile_addr === fixedPos.parent.profile_addr &&
            lock.place_number === fixedPos.parent.place_number &&
            lock.locked_pos === fixedPos.pos,
        );
        if (found) {
          setPositionLocked(true);
          return;
        }

        totalPages = response.total_pages;
        page += 1;
      }

      setPositionLocked(false);
    };

    void loadLockState();
    return () => {
      cancelled = true;
    };
  }, [
    currentProfile,
    fixedPos,
    marketingAddress,
    refreshKey,
    selectedStructure,
    supportsLocks,
  ]);

  if (!selectedNode) return <div className="details-panel" />;

  const isCurrentPlace =
    isFilled &&
    selectedNode.profile_addr === selectedPlace?.profile_addr &&
    selectedNode.place_number === selectedPlace?.place_number;
  const createdAt = isFilled
    ? new Date(Number(selectedNode.created_at) * 1_000)
    : undefined;
  const createdAtDate = createdAt?.toLocaleDateString();
  const createdAtTime = createdAt?.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const activatedAt =
    isFilled && selectedNode.activated_at !== null
      ? new Date(Number(selectedNode.activated_at) * 1_000)
      : undefined;
  const activatedAtDate = activatedAt?.toLocaleDateString();
  const activatedAtTime = activatedAt?.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const buyPosition = ownerRootPositioning ? null : fixedPos;
  const canBuy =
    selectedNode.node_type === "empty" &&
    selectedNode.can_buy &&
    buyCommand &&
    (ownerRootPositioning || fixedPos);
  const lockAction =
    fixedPos && positionLocked === true && unlockCommand
      ? "unlock"
      : fixedPos && positionLocked === false && lockCommand
        ? "lock"
        : null;
  const buyLabel = t("structure.buy", {
    price: displayedPrice,
    currency,
    defaultValue: `Buy (${displayedPrice} ${currency})`,
  });

  const handleBuy = async () => {
    if (
      !currentProfile ||
      !buyCommand ||
      (!ownerRootPositioning && !fixedPos)
    ) {
      return;
    }

    setDetailsStatus(null);
    setBuyLoading(true);
    try {
      const result = usesJetton
        ? await buyPlaceByJetton(
            tonConnectUI,
            marketingAddress,
            selectedStructure,
            currentProfile.address,
            wallet,
            buyPosition,
          )
        : await buyPlaceByTon(
            tonConnectUI,
            marketingAddress,
            selectedStructure,
            currentProfile.address,
            buyPosition,
          );

      setDetailsStatus(
        result.success
          ? {
              type: "success",
              text: t(
                "structure.buySuccess",
                "New place will appear on the places list soon.",
              ),
            }
          : {
              type: "error",
              text: translateError(t, result.error_code),
            },
      );
    } finally {
      setBuyLoading(false);
    }
  };

  const handleLockToggle = async (action: "lock" | "unlock") => {
    if (!currentProfile || !fixedPos) return;

    const commandTag =
      action === "unlock" ? UserCommandTag.unlockPos : UserCommandTag.lockPos;
    const command = action === "unlock" ? unlockCommand : lockCommand;
    if (!command) return;

    setDetailsStatus(null);
    setLockLoading(true);
    try {
      const result = await executePositionCommand(
        tonConnectUI,
        marketingAddress,
        selectedStructure,
        currentProfile.address,
        wallet,
        commandTag,
        fixedPos,
      );

      setDetailsStatus(
        result.success
          ? {
              type: "success",
              text:
                action === "unlock"
                  ? t(
                      "structure.unlockSuccess",
                      "Unlock request sent. Update the page shortly to see it.",
                    )
                  : t(
                      "structure.lockSuccess",
                      "Lock request sent. Update the page shortly to see it.",
                    ),
            }
          : {
              type: "error",
              text: translateError(t, result.error_code),
            },
      );
    } finally {
      setLockLoading(false);
    }
  };

  return (
    <div
      className={`details-panel ${
        selectedNode.node_type === "empty" && selectedNode.is_next_pos
          ? "details-panel--next"
          : ""
      }`}
    >
      {isFilled &&
        isCurrentPlace &&
        selectedNode.parent_place_number !== null && (
          <div className="details-top-actions">
            <button
              type="button"
              className="details-action details-action--ghost"
              onClick={() =>
                setSelectedPlace({
                  profile_addr: selectedNode.parent_profile_addr,
                  place_number: selectedNode.parent_place_number!,
                })
              }
            >
              {t("structure.up", "Up ▲")}
            </button>
          </div>
        )}

      {isFilled && (
        <>
          <div className="details-card-row">
            <div className="details-avatar details-avatar--inline">
              {imageUrl && !imageFailed ? (
                <img
                  src={imageUrl}
                  alt={selectedNode.profile_login ?? ""}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="details-avatar__placeholder" aria-hidden />
              )}
            </div>
            <div className="details-meta">
              <div className="details-meta__top">
                <span className="details-type-inline">$</span>
                <span className="details-id-inline">
                  #{selectedNode.place_number}
                </span>
              </div>
              <div className="details-meta__date">
                {createdAtDate} {createdAtTime}
              </div>
              <div className="details-meta__login">
                {selectedNode.profile_login ?? ""}
              </div>
              <div className="details-meta__desc">
                {t("structure.placesBelow", {
                  count: selectedNode.filling,
                  formattedCount: formatter.format(selectedNode.filling),
                  defaultValue: "{{formattedCount}} place below",
                  defaultValue_plural: "{{formattedCount}} places below",
                })}
              </div>
            </div>
          </div>

          <div className="details-line">
            <span className="details-label">
              {t("structure.level", "Level")}
            </span>
            <span>{selectedNode.level}</span>
          </div>
          <div className="details-line">
            <span className="details-label">
              {t("structure.status", "Status")}
            </span>
            <span>
              {selectedNode.is_active
                ? t("structure.active", "Active")
                : t("structure.inactive", "Inactive")}
            </span>
          </div>
          <div className="details-line">
            <span className="details-label">
              {t("structure.activatedAt", "Activated")}
            </span>
            <span>
              {activatedAt
                ? `${activatedAtDate} ${activatedAtTime}`
                : t("structure.notActivated", "Not activated")}
            </span>
          </div>

          {!isCurrentPlace && (
            <div className="details-desc-actions">
              <button
                type="button"
                className="details-action details-action--ghost"
                onClick={() =>
                  setSelectedPlace({
                    profile_addr: selectedNode.profile_addr,
                    place_number: selectedNode.place_number,
                  })
                }
              >
                {t("structure.select", "Select ▼")}
              </button>
            </div>
          )}
        </>
      )}

      {canBuy && (
        <button
          type="button"
          className="details-action details-action--primary"
          onClick={() => setConfirmAction("buy")}
          disabled={buyLoading || jettonMetadataLoading}
        >
          {buyLoading || jettonMetadataLoading
            ? t("home.loading", "Loading...")
            : buyLabel}
        </button>
      )}

      {lockAction && (
        <button
          type="button"
          className={`details-action ${
            lockAction === "lock" ? "danger" : ""
          }`}
          onClick={() => setConfirmAction(lockAction)}
          disabled={lockLoading}
        >
          {lockLoading
            ? t("home.loading", "Loading...")
            : lockAction === "unlock"
              ? t("structure.unlock", "Unlock")
              : t("structure.lock", "Lock")}
        </button>
      )}

      {detailsStatus && (
        <div className="details-status-row">
          <div className={`op-message ${detailsStatus.type}`} role="status">
            {detailsStatus.text}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === "lock"
            ? t("structure.confirmLockTitle", "Confirm locking")
            : confirmAction === "unlock"
              ? t("structure.confirmUnlockTitle", "Confirm unlocking")
              : t("structure.confirmTitle", "Confirm purchase")
        }
        message={
          <>
            <p>{t("structure.confirmBuy", "Are you sure?")}</p>
            <p>
              {t("structure.profileLabel", "Profile")}: {" "}
              <strong>{currentProfile?.login ?? ""}</strong>
            </p>
          </>
        }
        confirmLabel={
          confirmAction === "lock"
            ? t("structure.lock", "Lock")
            : confirmAction === "unlock"
              ? t("structure.unlock", "Unlock")
              : buyLabel
        }
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === "buy") {
            void handleBuy();
          } else if (action === "lock" || action === "unlock") {
            void handleLockToggle(action);
          }
        }}
      />
    </div>
  );
}

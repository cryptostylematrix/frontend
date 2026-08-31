import { useContext, useEffect, useMemo, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Address, fromNano } from "@ton/core";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../../App";
import noAvatar from "../../../assets/no-avatar.jpg";
import ConfirmDialog from "../../common/ConfirmDialog";
import { UserCommandTag } from "../../../contracts/schemes/UserCommand";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import { translateError } from "../../../errors/errorUtils";
import { useJettonMetadata } from "../../../hooks/useJettonMetadata";
import { getProfileNftData } from "../../../services/contractsApi";
import {
  type ProgramStructure,
  type ProgramTreeNode,
} from "../../../services/programApi";
import {
  buyPlaceByJetton,
  buyPlaceByTon,
  executeActivatePlace,
  executePositionCommand,
  type PlacePosData,
} from "../../../services/programStructuresService";
import { formatJettonAmount } from "../../../services/jettonMetadataService";
import "../../../pages/profile/update-profile.css";
import "./details.css";

const formatter = new Intl.NumberFormat("en-US");
const RANK_KEYS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "sapphire",
  "emerald",
  "diamond",
] as const;
type RankKey = (typeof RANK_KEYS)[number];

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
    notifyPlacePurchaseSubmitted,
    selectedPlace,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();
  const [buyLoading, setBuyLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "buy" | "activate" | "lock" | "unlock" | null
  >(null);

  const isFilled = selectedNode?.node_type === "filled";
  const isSystemClone = Boolean(
    isFilled && !selectedNode.profile_addr?.trim(),
  );
  const fixedPos = useMemo<PlacePosData | null>(() => {
    if (
      !selectedNode ||
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
  const buyPosition =
    selectedNode?.node_type === "empty" && selectedNode.include_position
      ? fixedPos
      : null;
  const displayedLogin = isSystemClone
    ? t("structure.systemClones", "System Clones")
    : isFilled
      ? selectedNode.profile_login ?? ""
      : "";
  const displayedImageUrl = isSystemClone ? noAvatar : imageUrl;
  const buyCommand =
    selectedNode?.node_type === "empty" && selectedNode.buy_command_tag !== null
      ? commands[String(selectedNode.buy_command_tag)]
      : undefined;
  const activateCommand =
    isFilled && selectedNode.activate_command_tag !== null
      ? commands[String(selectedNode.activate_command_tag)]
      : undefined;
  const lockCommand = commands[String(UserCommandTag.lockPos)];
  const unlockCommand = commands[String(UserCommandTag.unlockPos)];
  const usesJetton = Boolean(buyCommand?.sender_jetton_wallet?.trim());
  const { metadata: jettonMetadata, isLoading: jettonMetadataLoading } =
    useJettonMetadata(buyCommand?.sender_jetton_wallet);
  const {
    metadata: activationJettonMetadata,
    isLoading: activationJettonMetadataLoading,
  } = useJettonMetadata(activateCommand?.sender_jetton_wallet);
  const rawPrice = buyCommand?.price ?? 0;
  const displayedPrice = usesJetton
    ? jettonMetadata
      ? formatJettonAmount(rawPrice, jettonMetadata.decimals)
      : "—"
    : fromNano(rawPrice);
  const currency = usesJetton ? jettonMetadata?.symbol ?? "JETTON" : "TON";
  const activationUsesJetton = Boolean(
    activateCommand?.sender_jetton_wallet?.trim(),
  );
  const activationPrice = activateCommand?.price ?? 0;
  const displayedActivationPrice = activationUsesJetton
    ? activationJettonMetadata
      ? formatJettonAmount(
          activationPrice,
          activationJettonMetadata.decimals,
        )
      : "—"
    : fromNano(activationPrice);
  const activationCurrency = activationUsesJetton
    ? activationJettonMetadata?.symbol ?? "JETTON"
    : "TON";

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

  useEffect(() => {
    setDetailsStatus(null);
  }, [refreshKey]);

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
  const rank =
    selectedNode.node_type === "filled" ? selectedNode.rank?.trim() : null;
  const normalizedRank = rank?.toLowerCase() ?? "";
  const rankKey = RANK_KEYS.includes(normalizedRank as RankKey)
    ? (normalizedRank as RankKey)
    : null;
  const canBuy =
    selectedNode.node_type === "empty" &&
    selectedNode.can_buy &&
    buyCommand &&
    (!selectedNode.include_position || fixedPos);
  const canActivate = (() => {
    if (
      !isFilled ||
      !selectedNode.can_activate ||
      selectedNode.activate_command_tag !== UserCommandTag.activatePlace ||
      !activateCommand ||
      !selectedNode.profile_addr ||
      !currentProfile?.address
    ) {
      return false;
    }

    try {
      return Address.parse(selectedNode.profile_addr).equals(
        Address.parse(currentProfile.address),
      );
    } catch {
      return false;
    }
  })();
  const lockAction =
    selectedNode.can_unlock
      ? "unlock"
      : selectedNode.can_lock
        ? "lock"
        : null;
  const buyLabel = t("structure.buy", {
    price: displayedPrice,
    currency,
    defaultValue: `Buy (${displayedPrice} ${currency})`,
  });
  const activateLabel = t("structure.activate", {
    price: displayedActivationPrice,
    currency: activationCurrency,
    defaultValue: `Activate (${displayedActivationPrice} ${activationCurrency})`,
  });

  const handleBuy = async () => {
    if (
      !currentProfile ||
      !buyCommand ||
      (selectedNode.node_type === "empty" && selectedNode.include_position && !fixedPos)
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
      if (result.success) notifyPlacePurchaseSubmitted();
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

  const handleActivate = async () => {
    if (
      !canActivate ||
      !currentProfile ||
      selectedNode.node_type !== "filled"
    ) {
      return;
    }

    setDetailsStatus(null);
    setActivateLoading(true);
    try {
      const result = await executeActivatePlace(
        tonConnectUI,
        marketingAddress,
        selectedStructure,
        selectedNode.profile_addr!,
        wallet,
        selectedNode.place_number,
        UserCommandTag.activatePlace,
      );
      setDetailsStatus(
        result.success
          ? {
              type: "success",
              text: t(
                "structure.activateSuccess",
                "Activation request sent. Update the page shortly to see it.",
              ),
            }
          : {
              type: "error",
              text: translateError(t, result.error_code),
            },
      );
      if (result.success) notifyPlacePurchaseSubmitted();
    } finally {
      setActivateLoading(false);
    }
  };

  return (
    <div
      className={`details-panel ${selectedNode.locked ? "details-panel--locked" : ""} ${
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
              {displayedImageUrl && !imageFailed ? (
                <img
                  src={displayedImageUrl}
                  alt={displayedLogin}
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
                {displayedLogin}
              </div>
              {structure !== null && structure.height > 0 && (
                <div className="details-meta__desc">
                  {t("structure.matrixPlacesCount", {
                    count: selectedNode.matrix_places_count,
                    formattedCount: formatter.format(
                      selectedNode.matrix_places_count,
                    ),
                    defaultValue: "{{formattedCount}} matrix place",
                    defaultValue_plural: "{{formattedCount}} matrix places",
                  })}
                </div>
              )}
              <div className="details-meta__desc">
                {t("structure.placesBelow", {
                  count: selectedNode.descendants,
                  formattedCount: formatter.format(selectedNode.descendants),
                  defaultValue: "{{formattedCount}} place below",
                  defaultValue_plural: "{{formattedCount}} places below",
                })}
              </div>
              {rank && (
                <div
                  className={`details-rank ${
                    rankKey ? `details-rank--${rankKey}` : ""
                  }`}
                >
                  <span className="details-rank__label">
                    {t("structure.rank", "Rank")}
                  </span>
                  <strong>
                    {rankKey
                      ? t(`structure.ranks.${rankKey}`, {
                          defaultValue: rank,
                        })
                      : rank}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="details-line">
            <span className="details-label">
              {t("structure.line", "Line")}
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

      {canActivate && (
        <button
          type="button"
          className="details-action details-action--primary"
          onClick={() => setConfirmAction("activate")}
          disabled={activateLoading || activationJettonMetadataLoading}
        >
          {activateLoading || activationJettonMetadataLoading
            ? t("home.loading", "Loading...")
            : activateLabel}
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
              : confirmAction === "activate"
                ? t("structure.confirmActivateTitle", "Confirm activation")
              : t("structure.confirmTitle", "Confirm purchase")
        }
        message={
          <>
            <p>{t("structure.confirmBuy", "Are you sure?")}</p>
            <p>
              {t("structure.profileLabel", "Profile")}: {" "}
              <strong>{currentProfile?.login ?? ""}</strong>
            </p>
            {(currentProfile?.mode === "preview" || currentProfile?.owned === false) && (
              <p className="confirm-modal__warning">
                {t("structure.previewCommandWarning", {
                  login: currentProfile.login,
                  defaultValue:
                    "Attention: this profile belongs to another wallet. This command will be executed for the foreign profile {{login}}.",
                })}
              </p>
            )}
          </>
        }
        confirmLabel={
          confirmAction === "lock"
            ? t("structure.lock", "Lock")
            : confirmAction === "unlock"
              ? t("structure.unlock", "Unlock")
              : confirmAction === "activate"
                ? activateLabel
              : buyLabel
        }
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === "buy") {
            void handleBuy();
          } else if (action === "activate") {
            void handleActivate();
          } else if (action === "lock" || action === "unlock") {
            void handleLockToggle(action);
          }
        }}
      />
    </div>
  );
}

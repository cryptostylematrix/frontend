import "./matrix-tree-details.css";
import "../../../../pages/profile/update-profile.css";
import type { MarketingTreeFilledNode, MarketingTreeNode } from "../../../../services/marketingApi";
import { getPlacesCount } from "../../../../services/marketingApi";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../../context/ProfileContext";
import { buyPlaceByJetton, buyPlaceByTon, lockPos, unlockPos } from "../../../../services/marketingService";
import { translateError } from "../../../../errors/errorUtils";
import { useContext, useEffect, useState } from "react";
import { getProfileNftData, getProfileProgram } from "../../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Address } from "@ton/core";
import type { PlacePosData } from "../../../../types/marketing";
import ConfirmDialog from "../../../common/ConfirmDialog";
import { WalletContext } from "../../../../App";

const formatter = new Intl.NumberFormat("en-US");

type Props = {
  selectedNode: MarketingTreeNode | null;
};

const isFilledNode = (node: MarketingTreeNode): node is MarketingTreeFilledNode => "addr" in node;

export function MatrixTreeDetails({ selectedNode }: Props) {
  const {
    jettonMarketing,
    marketingAddr,
    matrixCurrency,
    matrixPrice,
    selectedMatrix,
    selectedPlaceAddress,
    setSelectedPlace,
    program,
  } = useMarketingContext();
  const { currentProfile } = useProfileContext();
  const { wallet } = useContext(WalletContext)!;
  const [tonConnectUI] = useTonConnectUI();
  const { t } = useTranslation();
  const upLabel = t("matrix.tree.up", { defaultValue: "Up ▲" });
  const [buyLoading, setBuyLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"buy" | "lock" | "unlock" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageUrl("");
    setImageFailed(false);

    const loadImage = async () => {
      if (!selectedNode || !isFilledNode(selectedNode)) return;
      const nftData = await getProfileNftData(selectedNode.profile_addr);
      if (cancelled) return;
      setImageUrl(nftData?.content?.image_url ?? "");
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  useEffect(() => {
    setDetailsStatus(null);
    setConfirmAction(null);
  }, [selectedNode]);

  if (!selectedNode) {
    return <div className="details-panel" />;
  }

  const isFilled = isFilledNode(selectedNode);
  const isLocked = selectedNode.locked;
  const canLock = selectedNode.can_lock;
  const isLock = selectedNode.is_lock;
  const isNext = !isFilled && selectedNode.is_next_pos;
  const createdAt = isFilled ? new Date(Number(selectedNode.created_at)) : undefined;
  const tonViewerUrl = isFilled ? `https://tonviewer.com/${selectedNode.addr}` : undefined;
  const createdAtDate = createdAt ? createdAt.toLocaleDateString() : undefined;
  const createdAtTime = createdAt
    ? createdAt.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : undefined;
  const canBuy = !isFilled && selectedNode.can_buy;
  const confirmBuyMessage = (
    <>
      <p>{t("matrix.filters.confirmBuy", "Are you sure?")}</p>
      <p>
        {t("matrix.filters.profileLabel", "Profile")}: <strong>{currentProfile?.login ?? ""}</strong>
      </p>
    </>
  );
  const confirmTitle =
    confirmAction === "lock"
      ? t("matrix.filters.confirmLockTitle", "Confirm locking")
      : confirmAction === "unlock"
        ? t("matrix.filters.confirmUnlockTitle", "Confirm unlocking")
        : t("matrix.filters.confirmTitle", "Confirm purchase");
  const confirmLabel =
    confirmAction === "lock"
      ? t("matrix.tree.lock", { defaultValue: "Lock" })
      : confirmAction === "unlock"
        ? t("matrix.tree.unlock", { defaultValue: "Unlock" })
        : t("matrix.tree.buy", { defaultValue: "Buy", price: matrixPrice });

  const fixedpos: PlacePosData | undefined = selectedNode.parent_addr
    ? { parent: Address.parse(selectedNode.parent_addr), pos: selectedNode.pos }
    : undefined;

  const handleBuy = async () => {
    if (!currentProfile || !fixedpos || !marketingAddr) return;

    setDetailsStatus(null);
    setBuyLoading(true);

    try {
      const programData = await getProfileProgram(currentProfile.address, program);
      if (!programData || programData.confirmed !== 1) {
        setDetailsStatus({
          type: "error",
          text: t("matrix.filters.programNotConfirmed", "You need to choose an inviter first."),
        });
        return;
      }

      const result = jettonMarketing
        ? await buyPlaceByJetton(tonConnectUI, marketingAddr, selectedMatrix, currentProfile.address, wallet, fixedpos)
        : await buyPlaceByTon(tonConnectUI, marketingAddr, selectedMatrix, currentProfile.address, fixedpos);
      if (result.success) {
        setDetailsStatus({
          type: "success",
          text: t("matrix.filters.buySuccess", "New place will appear on places list soon."),
        });
      } else {
        const code = result.error_code;
        setDetailsStatus({
          type: "error",
          text: code ? translateError(t, code) : t("matrix.filters.buyFail", "Fail"),
        });
      }
    } finally {
      setBuyLoading(false);
    }
  };

  const handleLockToggle = async () => {
    if (!currentProfile || !fixedpos || !marketingAddr) return;

    setDetailsStatus(null);
    setLockLoading(true);

    try {
      const count = await getPlacesCount(marketingAddr, selectedMatrix, currentProfile.address);
      if (count <= 0) {
        setDetailsStatus({
          type: "error",
          text: t(
            "matrix.filters.noPlacesInMatrix",
            "You need a place in this matrix to perform this action."
          ),
        });
        return;
      }
      const handler = isLock ? unlockPos : lockPos;
      const result = await handler(tonConnectUI, marketingAddr, selectedMatrix, currentProfile.address, fixedpos);
      if (result.success) {
        setDetailsStatus({
          type: "success",
          text: isLock
            ? t("matrix.tree.unlockSuccess", {
                defaultValue:
                  "Unlock request sent. The unlock will appear soon; update the page in a while to see it.",
              })
            : t("matrix.tree.lockSuccess", {
                defaultValue:
                  "Lock request sent. The lock will appear soon; update the page in a while to see it.",
              }),
        });
      } else {
        const code = result.error_code;
        setDetailsStatus({
          type: "error",
          text: code ? translateError(t, code) : t("matrix.filters.buyFail", "Fail"),
        });
      }
    } finally {
      setLockLoading(false);
    }
  };

  return (
    <div className={`details-panel ${isLocked ? "details-panel--locked" : ""} ${isNext ? "details-panel--next" : ""}`}>
      {isFilled && selectedNode.addr === selectedPlaceAddress && selectedNode.parent_addr && (
        <div className="details-top-actions">
          <button
            type="button"
            className="details-action details-action--ghost"
            onClick={() => setSelectedPlace(selectedNode.parent_addr!)}
          >
            {upLabel}
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
                  alt={selectedNode.profile_login}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="details-avatar__placeholder" aria-hidden />
              )}
            </div>
            <div className="details-meta">
              <div className="details-meta__top">
                <span className="details-type-inline">$</span>
                <span className="details-id-inline">#{selectedNode.place_number}</span>

                <a
                  className="details-meta__tonviewer-link"
                  href={tonViewerUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("matrix.tree.viewInTonViewer", {
                    defaultValue: "Open in TonViewer",
                  })}
                >
                  <span className="details-meta__tonviewer-label">
                    {t("matrix.tree.toViewer", { defaultValue: "tonviewer" })}
                    <span className="details-meta__tonviewer-arrow">➤</span>
                  </span>
                </a>
              </div>

              <div className="details-meta__date">
                {createdAtDate} {createdAtTime}
              </div>

              <div className="details-meta__login">{selectedNode.profile_login}</div>
              <div className="details-meta__desc">
                {t("matrix.tree.placesBelow", {
                  count: selectedNode.descendants,
                  formattedCount: formatter.format(selectedNode.descendants),
                  defaultValue: "{{formattedCount}} place below",
                  defaultValue_plural: "{{formattedCount}} places below",
                })}
              </div>
            </div>
          </div>

          {selectedNode.addr !== selectedPlaceAddress && (
            <div className="details-desc-actions">
              <button
                type="button"
                className="details-action details-action--ghost"
                onClick={() => setSelectedPlace(selectedNode.addr)}
              >
                {t("matrix.tree.select", { defaultValue: "Select ▼" })}
              </button>
            </div>
          )}
        </>
      )}

      {canBuy && fixedpos && (
        <button
          type="button"
          className="details-action details-action--primary"
          onClick={() => {
            if (currentProfile) setConfirmAction("buy");
          }}
          disabled={buyLoading}
        >
          {buyLoading
            ? t("home.loading", "Loading...")
            : t("matrix.tree.buy", {
                defaultValue: "Buy ({{price}} {{currency}})",
                price: matrixPrice,
                currency: matrixCurrency,
              })}
        </button>
      )}

      {(isLock || canLock) && fixedpos && (
        <button
          type="button"
          className={`details-action ${!isLock ? "danger" : ""}`}
          onClick={() => setConfirmAction(isLock ? "unlock" : "lock")}
          disabled={lockLoading}
        >
          {lockLoading
            ? t("home.loading", "Loading...")
            : isLock
              ? t("matrix.tree.unlock", { defaultValue: "Unlock" })
              : t("matrix.tree.lock", { defaultValue: "Lock" })}
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
        title={confirmTitle}
        message={confirmBuyMessage}
        confirmLabel={confirmLabel}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === "buy") {
            handleBuy();
            return;
          }
          handleLockToggle();
        }}
      />
    </div>
  );
}

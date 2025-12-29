import "./multi-matrix-tree-details.css";
import type { TreeNode } from "../../../../services/matrixApi";
import { useMatrixContext } from "../../../../context/MatrixContext";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../../context/ProfileContext";
import { buyPlace, lockPos, unlockPos } from "../../../../services/multiService";
import { translateError } from "../../../../errors/errorUtils";
import { useEffect, useState } from "react";
import { getPlacesCount } from "../../../../services/matrixApi";
import { getProfileNftData, getProfilePrograms } from "../../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Address } from "@ton/core";
import type { PlacePosData } from "../../../../types/multi";

const formatter = new Intl.NumberFormat("en-US");

type Props = {
  selectedNode: TreeNode | null;
};

export function MultiMatrixTreeDetails({ selectedNode }: Props) {
  const { matrixPrice, setSelectedPlace, selectedMatrix } = useMatrixContext();
  const { currentProfile } = useProfileContext();
  const { selectedPlaceAddress } = useMatrixContext();
  const [tonConnectUI] = useTonConnectUI();
  const { t } = useTranslation();
  const upLabel = t("multiMatrix.tree.up", { defaultValue: "Up ▲" });
  const [buyLoading, setBuyLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageUrl("");
    setImageFailed(false);

    const loadImage = async () => {
      if (!selectedNode || selectedNode.kind !== "filled") return;
      const nftData = await getProfileNftData(selectedNode.profile_addr);
      if (cancelled) return;
      setImageUrl(nftData?.content?.image_url ?? "");
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [selectedNode]);



  if (!selectedNode) {
    return (
      <div className="details-panel" />
    );
  }

  const isFilled = selectedNode.kind === "filled";
  const isLocked = selectedNode.locked;
  const canLock = selectedNode.can_lock;
  const isLock = selectedNode.is_lock;
  const isNext = selectedNode.kind === "empty" && selectedNode.is_next_pos;
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
  const canBuy = selectedNode.kind == "empty" && selectedNode.can_buy;

  const fixedpos: PlacePosData | undefined = selectedNode.parent_addr ? 
    { parent: Address.parse(selectedNode.parent_addr), pos: selectedNode.pos } :
    undefined;


  return (
    <div className={`details-panel ${isLocked ? "details-panel--locked" : ""} ${isNext ? "details-panel--next" : ""}`}>
      { isFilled && selectedNode.addr == selectedPlaceAddress && 
        <div className="details-top-actions">
            <button
              type="button"
              className="details-action details-action--ghost"
              onClick={() => {
                if (selectedNode.kind === "filled") {
                  setSelectedPlace(selectedNode.parent_addr || undefined);
                }
              }}
              disabled={selectedNode.kind !== "filled"}
            >
              {upLabel}
            </button>
        </div>
      }

      {isFilled && 
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
                <span className="details-type-inline">{selectedNode.clone ? "⧉" : "$"}</span>
                <span className="details-id-inline">#{selectedNode.place_number}</span>

              <a
                  className="details-meta__tonviewer-link"
                  href={tonViewerUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("multiMatrix.tree.viewInTonViewer", {
                    defaultValue: "Open in TonViewer",
                  })}
                >
                  <span className="details-meta__tonviewer-label">
                    {t("multiMatrix.tree.toViewer", { defaultValue: "tonviewer" })}
                    <span className="details-meta__tonviewer-arrow">➤</span>
                  </span>
                </a>

              </div>

            <div className="details-meta__date">
              { createdAtDate }{" "}
              { createdAtTime }
            </div>

            <div className="details-meta__login">{selectedNode.profile_login}</div>
            <div className="details-meta__desc">
              {t("multiMatrix.tree.placesBelow", {
                count: selectedNode.descendants,
                  formattedCount: formatter.format(selectedNode.descendants),
                  defaultValue: "{{formattedCount}} place below",
                  defaultValue_plural: "{{formattedCount}} places below",
                })}
              </div>
            </div>
          </div>
          
          { selectedNode.addr != selectedPlaceAddress && 
            <div className="details-desc-actions">
              <button
                type="button"
                className="details-action details-action--ghost"
                onClick={() => {
                  setSelectedPlace(selectedNode.kind === "filled" ? selectedNode.addr : undefined);
                }}
              >
                {t("multiMatrix.tree.select", { defaultValue: "Select ▼" })}
              </button>
            </div>
          }
        </>
      }

      { canBuy && fixedpos &&
        <button
            type="button"
            className="details-action details-action--primary"
            onClick={async () => {
              if (!currentProfile) return;
              if (!window.confirm(t("multiMatrix.filters.confirmBuy", "Are you sure?"))) return;

              setBuyLoading(true);
              if (selectedMatrix === 1) {
                const program = await getProfilePrograms(currentProfile.address);
                if (!program?.multi || program.multi.confirmed !== 1) {
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
              const result = await buyPlace(tonConnectUI, selectedMatrix, currentProfile.address, fixedpos);
              setBuyLoading(false);
              if (result.success) {
                alert(t("multiMatrix.filters.buySuccess", "New place will appear on places list soon."));
              } else {
                const code = result.error_code;
                alert(code ? translateError(t, code) : t("multiMatrix.filters.buyFail", "Fail"));
              }
            }}
            disabled={buyLoading}
          >
            {buyLoading
              ? t("home.loading", "Loading...")
              : t("multiMatrix.tree.buy", {
                  defaultValue: "Buy ({{price}} TON)",
                  price: matrixPrice,
              })}
        </button>
      }


      { (isLock || canLock) && fixedpos &&
        <button
          type="button"
          className={`details-action ${!isLock ? "danger" : ""}`}
          onClick={async () => {
            if (!currentProfile) return;
            setLockLoading(true);
            const count = await getPlacesCount(selectedMatrix, currentProfile.address);
            if (count <= 0) {
              setLockLoading(false);
              alert(t("multiMatrix.filters.noPlacesInMatrix", "You need a place in this matrix to perform this action."));
              return;
            }
            const handler = isLock ? unlockPos : lockPos;
            const result = await handler(tonConnectUI, Date.now(), selectedMatrix, currentProfile.address, fixedpos);
            setLockLoading(false);
            if (result.success) {
              alert(
                isLock
                  ? t("multiMatrix.tree.unlockSuccess", {
                      defaultValue:
                        "Unlock request sent. The unlock will appear soon; update the page in a while to see it.",
                    })
                  : t("multiMatrix.tree.lockSuccess", {
                      defaultValue:
                        "Lock request sent. The lock will appear soon; update the page in a while to see it.",
                    })
              );
            } else {
              const code = result.error_code;
              alert(code ? translateError(t, code) : t("multiMatrix.filters.buyFail", "Fail"));
            }
          }}
          disabled={lockLoading}
        >
          {lockLoading
            ? t("home.loading", "Loading...")
            : isLock
              ? t("multiMatrix.tree.unlock", { defaultValue: "Unlock" })
              : t("multiMatrix.tree.lock", { defaultValue: "Lock" })}
        </button>
      }
    </div>
  );
}

import "./multi-matrix-tree-details.css";
import type { TreeNode } from "../../../../services/matrixService";
import { useMatrixContext } from "../../../../context/MatrixContext";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../../context/ProfileContext";
import { buyPlace, lockPos, unlockPos } from "../../../../services/multiService";
import { translateError } from "../../../../errors/errorUtils";
import { useState } from "react";
import { getPlacesCount } from "../../../../services/matrixService";
import { getProfileProgramData } from "../../../../services/profileService";
import { Programs } from "../../../../contracts/MultiConstants";
import { useTonConnectUI } from "@tonconnect/ui-react";

const formatter = new Intl.NumberFormat("en-US");

type Props = {
  selectedNode: TreeNode | null;
};

export function MultiMatrixTreeDetails({ selectedNode }: Props) {
  const { matrixPrice, setSelectedPlace, selectedMatrix } = useMatrixContext();
  const { currentProfile } = useProfileContext();
  const [tonConnectUI] = useTonConnectUI();
  const { t } = useTranslation();
  const upLabel = t("multiMatrix.tree.up", { defaultValue: "Up ▲" });
  const [buyLoading, setBuyLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);

  if (!selectedNode) {
    return (
      <div className="details-panel" />
    );
  }

  const isFilled = selectedNode.kind === "filled";
  const isLocked = isFilled && selectedNode.locked;
  const isNext = selectedNode.kind === "empty" && selectedNode.is_next_pos;

  return (
    <div className={`details-panel ${isLocked ? "details-panel--locked" : ""} ${isNext ? "details-panel--next" : ""}`}>
      <div className="details-top-actions">
        <button
          type="button"
          className="details-action details-action--ghost"
          onClick={() => {
            if (selectedNode.kind === "filled") {
              setSelectedPlace(selectedNode.parent_address || undefined);
            }
          }}
          disabled={selectedNode.kind !== "filled"}
        >
          {upLabel}
        </button>
      </div>

      {isFilled ? (
        <>
          <div className="details-card-row">
            <div className="details-avatar details-avatar--inline">
              <img src={selectedNode.image_url} alt={selectedNode.login} />
            </div>
            <div className="details-meta">
              <div className="details-meta__top">
                <span className="details-type-inline">{selectedNode.clone ? "⧉" : "$"}</span>
                <span className="details-id-inline">#{selectedNode.place_number}</span>
              </div>
              <div className="details-meta__date">
                {new Date(selectedNode.created_at * 1000).toLocaleDateString()}{" "}
                {new Date(selectedNode.created_at * 1000).toLocaleTimeString()}
              </div>
            <div className="details-meta__login">{selectedNode.login}</div>
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
          <button
            type="button"
            className={`details-action ${!isLocked ? "danger" : ""}`}
            onClick={async () => {
              if (!currentProfile || selectedNode.kind !== "filled") return;
              setLockLoading(true);
              const count = await getPlacesCount(selectedMatrix, currentProfile.address);
              if (count <= 0) {
                setLockLoading(false);
                alert(t("multiMatrix.filters.noPlacesInMatrix", "You need a place in this matrix to perform this action."));
                return;
              }
              const handler = isLocked ? unlockPos : lockPos;
              const result = await handler(tonConnectUI, Date.now(), selectedMatrix, currentProfile.address, selectedNode.address);
              setLockLoading(false);
              if (result.success) {
                alert(
                  isLocked
                    ? t("multiMatrix.tree.unlockSuccess", { defaultValue: "Position unlocked." })
                    : t("multiMatrix.tree.lockSuccess", { defaultValue: "Position locked." })
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
              : isLocked
                ? t("multiMatrix.tree.unlock", { defaultValue: "Unlock" })
                : t("multiMatrix.tree.lock", { defaultValue: "Lock" })}
          </button>

          <div className="details-desc-actions">
            <button
              type="button"
              className="details-action details-action--ghost"
              onClick={() => {
                 setSelectedPlace(selectedNode.kind === "filled" ? selectedNode.address : undefined);
              }}
            >
              {t("multiMatrix.tree.select", { defaultValue: "Select ▼" })}
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="details-action details-action--primary"
            onClick={async () => {
              if (!currentProfile) return;
              if (!window.confirm(t("multiMatrix.filters.confirmBuy", "Are you sure?"))) return;

              setBuyLoading(true);
              if (selectedMatrix === 1) {
                const program = await getProfileProgramData(currentProfile.address, Programs.multi);
                if (!program.success || !program.data || !program.data.confirmed) {
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
              const result = await buyPlace(tonConnectUI, selectedMatrix, currentProfile.address, undefined);
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
        </>
      )}
    </div>
  );
}

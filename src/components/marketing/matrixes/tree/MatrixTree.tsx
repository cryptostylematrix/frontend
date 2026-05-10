import "./matrix-tree.css";
import { useEffect, useMemo, useState } from "react";
import { MatrixTreeGrid } from "./MatrixTreeGrid";
import { MatrixTreeDetails } from "./MatrixTreeDetails";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { useProfileContext } from "../../../../context/ProfileContext";
import { getTree, type MarketingTreeNode } from "../../../../services/marketingApi";

const UNLIMITED_PAGE_SIZE = 8;

export default function MatrixTree() {
  const { marketingAddr, refreshKey, selectedPlaceAddress } = useMarketingContext();
  const { currentProfile } = useProfileContext();
  const [loadedNode, setLoadedNode] = useState<MarketingTreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MarketingTreeNode | null>(null);
  const [fromPos, setFromPos] = useState(0);

  const unlimitedWidth = loadedNode?.width === 0;
  const toPos = useMemo(() => fromPos + UNLIMITED_PAGE_SIZE - 1, [fromPos]);

  useEffect(() => {
    setFromPos(0);
  }, [selectedPlaceAddress, currentProfile?.address]);

  useEffect(() => {
    let isCancelled = false;
    setLoadedNode(null);
    setSelectedNode(null);

    const load = async () => {
      if (!marketingAddr || !selectedPlaceAddress || !currentProfile) return;
      const fetched = await getTree(
        marketingAddr,
        currentProfile.address,
        selectedPlaceAddress,
        fromPos,
        toPos
      );
      if (isCancelled) return;
      setLoadedNode(fetched);
      setSelectedNode(fetched);
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [marketingAddr, selectedPlaceAddress, currentProfile, refreshKey, fromPos, toPos]);

  return (
    <div className="matrix-row matrix-row--layout">
      <div>
        {unlimitedWidth && (
          <div className="tree-range-controls">
            <button
              type="button"
              className="tree-range-button"
              onClick={() => setFromPos((value) => Math.max(0, value - UNLIMITED_PAGE_SIZE))}
              disabled={fromPos === 0}
            >
              Left
            </button>
            <span className="tree-range-label">
              {fromPos} - {toPos}
            </span>
            <button
              type="button"
              className="tree-range-button"
              onClick={() => setFromPos((value) => value + UNLIMITED_PAGE_SIZE)}
            >
              Right
            </button>
          </div>
        )}
        <MatrixTreeGrid
          node={loadedNode}
          onSelect={(node) => {
            setSelectedNode(node);
          }}
        />
      </div>
      <MatrixTreeDetails selectedNode={selectedNode} />
    </div>
  );
}

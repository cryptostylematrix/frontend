import "./matrix-tree.css";
import { useEffect, useMemo, useState } from "react";
import { MatrixTreeGrid } from "./MatrixTreeGrid";
import { MatrixTreeDetails } from "./MatrixTreeDetails";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { useProfileContext } from "../../../../context/ProfileContext";
import { getTree, type MarketingTreeNode } from "../../../../services/marketingApi";

const UNLIMITED_PAGE_SIZE = 4;
const INITIAL_FROM_POS = 1;

export default function MatrixTree() {
  const { marketingAddr, refreshKey, selectedMatrixConfig, selectedPlaceAddress } = useMarketingContext();
  const { currentProfile } = useProfileContext();
  const [loadedNode, setLoadedNode] = useState<MarketingTreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MarketingTreeNode | null>(null);
  const [fromPos, setFromPos] = useState(INITIAL_FROM_POS);
  const [isLoading, setIsLoading] = useState(false);

  const matrixWidth = selectedMatrixConfig?.width;
  const unlimitedWidth = matrixWidth === 0;
  const toPos = useMemo(() => {
    if (matrixWidth !== undefined && matrixWidth !== 0) return matrixWidth;
    return fromPos + UNLIMITED_PAGE_SIZE - 1;
  }, [fromPos, matrixWidth]);

  useEffect(() => {
    setFromPos(INITIAL_FROM_POS);
  }, [selectedMatrixConfig, selectedPlaceAddress, currentProfile?.address]);

  useEffect(() => {
    let isCancelled = false;
    setLoadedNode(null);
    setSelectedNode(null);
    setIsLoading(false);

    const load = async () => {
      if (!marketingAddr || !selectedPlaceAddress || !currentProfile || !selectedMatrixConfig) return;
      setIsLoading(true);
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
      setIsLoading(false);
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [marketingAddr, selectedPlaceAddress, currentProfile, refreshKey, fromPos, toPos, selectedMatrixConfig]);

  return (
    <div className="matrix-row matrix-row--layout">
      <div>
        {unlimitedWidth && selectedPlaceAddress && (
          <div className="tree-range-controls">
            <button
              type="button"
              className="tree-range-button"
              onClick={() => setFromPos((value) => Math.max(INITIAL_FROM_POS, value - UNLIMITED_PAGE_SIZE))}
              disabled={fromPos === INITIAL_FROM_POS}
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
          isLoading={isLoading || !selectedMatrixConfig}
          node={selectedPlaceAddress ? loadedNode : null}
          placeholderConfig={selectedPlaceAddress ? undefined : selectedMatrixConfig}
          onSelect={(node) => {
            setSelectedNode(node);
          }}
        />
      </div>
      <MatrixTreeDetails selectedNode={selectedNode} />
    </div>
  );
}

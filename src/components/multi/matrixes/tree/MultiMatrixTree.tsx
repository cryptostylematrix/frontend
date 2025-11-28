import "./multi-matrix-tree.css";
import { useEffect, useState } from "react";
import { MultiMatrixTreeGrid } from "./MultiMatrixTreeGrid";
import { MultiMatrixTreeDetails } from "./MultiMatrixTreeDetails";
import { useMatrixContext } from "../../../../context/MatrixContext";
import { useProfileContext } from "../../../../context/ProfileContext";
import { getMatrix, type TreeNode } from "../../../../services/matrixService";

export default function MultiMatrixTree() {
  const { selectedPlaceAddress } = useMatrixContext();
  const { currentProfile } = useProfileContext();
  const [ loadedNode, setLoadedNode] = useState<TreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);


  useEffect(() => {
    let isCancelled = false;
    setLoadedNode(null);
    setSelectedNode(null);

    const load = async () => {
      if (!selectedPlaceAddress || !currentProfile) return;
      const fetched = await getMatrix(selectedPlaceAddress, currentProfile.address);
      if (isCancelled) return;
      setLoadedNode(fetched);
      setSelectedNode(fetched);
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [selectedPlaceAddress, currentProfile]);

  return (
    <div className="matrix-row matrix-row--layout">
      <MultiMatrixTreeGrid node={loadedNode}
        onSelect={(node) => {
          setSelectedNode(node);
        }} 
      />
      <MultiMatrixTreeDetails selectedNode={selectedNode} />
    </div>
  );
}

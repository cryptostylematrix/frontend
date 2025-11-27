import "./multi-matrix-tree.css";

export default function MultiMatrixTree() {
  return (
    <div className="matrix-row matrix-row--layout">
      <div className="tree-panel">
        <p className="panel-label">Binary Tree (3 levels)</p>
        <div className="tree-level level-1">
          <div className="tree-node">Root</div>
        </div>
        <div className="tree-level level-2">
          <div className="tree-node">Left</div>
          <div className="tree-node">Right</div>
        </div>
        <div className="tree-level level-3">
          <div className="tree-node">L1</div>
          <div className="tree-node">L2</div>
          <div className="tree-node">R1</div>
          <div className="tree-node">R2</div>
        </div>
      </div>

      <div className="details-panel">
        <p className="panel-label">Details / Preview</p>
        <p className="placeholder-text">Right-side content placeholder.</p>
      </div>
    </div>
  );
}

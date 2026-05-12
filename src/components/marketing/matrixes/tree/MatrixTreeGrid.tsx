import type { MarketingTreeNode } from "../../../../services/marketingApi";
import type { MatrixConfigResponse } from "../../../../services/contractsApi";
import "./matrix-tree-grid.css";

import { useEffect, useMemo, useState } from "react";

type Props = {
  isLoading?: boolean;
  node: MarketingTreeNode | null;
  placeholderConfig?: MatrixConfigResponse;
  onSelect: (node: MarketingTreeNode) => void;
};

const isFilledNode = (node: MarketingTreeNode) => "addr" in node;
const UNLIMITED_PLACEHOLDER_WIDTH = 4;

type TreeGridItem = {
  node?: MarketingTreeNode;
  pos: number;
  placeholder?: boolean;
};

export function MatrixTreeGrid({ isLoading = false, node, placeholderConfig, onSelect }: Props) {
  const [selectedPos, setSelectedPos] = useState<number | undefined>(undefined);

  const levels = useMemo(() => {
    if (!node && placeholderConfig) {
      const width = placeholderConfig.width === 0 ? UNLIMITED_PLACEHOLDER_WIDTH : Math.max(1, placeholderConfig.width);
      const height = Number(placeholderConfig.height);
      const maxDepth = Number.isFinite(height) ? Math.max(1, height + 1) : 1;
      const result: Array<Array<TreeGridItem>> = [];
      let counter = 1;
      let levelWidth = 1;

      for (let depth = 0; depth < maxDepth; depth += 1) {
        result[depth] = Array.from({ length: levelWidth }, () => ({
          pos: counter++,
          placeholder: true,
        }));
        levelWidth *= width;
      }

      return result;
    }

    if (!node) return [];

    const result: Array<Array<TreeGridItem>> = [];
    const height = Number(node.height);
    const maxDepth = Number.isFinite(height) ? Math.max(1, height + 1) : 1;
    let counter = 1;
    const queue: Array<{ node: MarketingTreeNode; depth: number }> = [{ node, depth: 0 }];
    while (queue.length) {
      const { node: currentNode, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      if (!result[depth]) result[depth] = [];
      const pos = counter++;
      result[depth].push({ node: currentNode, pos });
      currentNode.children?.forEach((child) => {
        if (child) queue.push({ node: child, depth: depth + 1 });
      });
    }
    return result;
  }, [node, placeholderConfig]);

  useEffect(() => {
    if (node) {
      setSelectedPos(1);
    } else {
      setSelectedPos(undefined);
    }
  }, [node]);

  return (
    <div className="tree-panel">
      <div className="tree-canvas desktop-tree">
        {isLoading ? (
          <div className="tree-loading">
            <span className="tree-loading__spinner" />
          </div>
        ) : !node && !placeholderConfig ? (
          <div className="tree-empty">No tree data</div>
        ) : (
          <div className="tree-grid">
            {levels.map((level, levelIndex) => (
              <div
                key={`level-${levelIndex}`}
                className="tree-level"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, level.length)}, minmax(0, 1fr))` }}
              >
                {level.map(({ node, placeholder, pos }) => {
                  const filled = node ? isFilledNode(node) : false;
                  const isSelected = selectedPos === pos;
                  const nextClass = node && !isFilledNode(node) && node.is_next_pos ? "node-next" : "";
                  const lockedClass = node?.locked ? "node-locked" : "";
                  const nodeKind = filled ? "filled" : "empty";
                  const login = node && isFilledNode(node) ? node.profile_login : "-";
                  return (
                    <div
                      key={pos}
                      className={`tree-node-wrapper ${placeholder ? "is-placeholder" : ""}`}
                      onClick={() => {
                        if (!node) return;
                        onSelect(node);
                        setSelectedPos(pos);
                      }}
                    >
                      <div
                        className={`tree-node node-${nodeKind} ${nextClass} ${lockedClass} ${
                          isSelected ? "is-selected" : ""
                        }`}
                      >
                        <div className="tree-node__login">{login}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

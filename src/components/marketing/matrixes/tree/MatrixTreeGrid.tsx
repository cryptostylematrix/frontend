import type { MarketingTreeNode } from "../../../../services/marketingApi";
import "./matrix-tree-grid.css";

import { useEffect, useMemo, useState } from "react";

type Props = {
  node: MarketingTreeNode | null;
  onSelect: (node: MarketingTreeNode) => void;
};

const placeholderEmptyNode: MarketingTreeNode = {
  kind: "empty",
  is_next_pos: false,
  can_buy: false,
  parent_addr: null,
  locked: false,
  can_lock: false,
  is_lock: false,
  pos: 0,
  seq_no: 0,
  width: 2,
  height: 3,
  children: null,
};

const PLACEHOLDER_LEVELS: Array<Array<{ node: MarketingTreeNode; pos: number }>> = (() => {
  const result: Array<Array<{ node: MarketingTreeNode; pos: number }>> = [];
  let pos = 1;
  for (let depth = 0; depth < 3; depth += 1) {
    const width = 2 ** depth;
    const level: Array<{ node: MarketingTreeNode; pos: number }> = [];
    for (let i = 0; i < width; i += 1) {
      level.push({ node: placeholderEmptyNode, pos: pos++ });
    }
    result.push(level);
  }
  return result;
})();

const isFilledNode = (node: MarketingTreeNode) => "addr" in node;

export function MatrixTreeGrid({ node, onSelect }: Props) {
  const [selectedPos, setSelectedPos] = useState<number | undefined>(undefined);

  const levels = useMemo(() => {
    if (!node) return PLACEHOLDER_LEVELS;

    const result: Array<Array<{ node: MarketingTreeNode; pos: number }>> = [];
    const maxDepth = Math.max(1, Number(node.height) || 1);
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
  }, [node]);

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
        <div className="tree-grid">
          {levels.map((level, levelIndex) => (
            <div
              key={`level-${levelIndex}`}
              className="tree-level"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, level.length)}, minmax(0, 1fr))` }}
            >
              {level.map(({ node, pos }) => {
                const filled = isFilledNode(node);
                const isSelected = selectedPos === pos;
                const nextClass = !filled && node.is_next_pos ? "node-next" : "";
                const lockedClass = node.locked ? "node-locked" : "";
                const nodeKind = filled ? "filled" : "empty";
                return (
                  <div
                    key={pos}
                    className="tree-node-wrapper"
                    onClick={() => {
                      onSelect(node);
                      setSelectedPos(pos);
                    }}
                  >
                    <div
                      className={`tree-node node-${nodeKind} ${nextClass} ${lockedClass} ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <div className="tree-node__login">{filled ? node.profile_login : "-"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

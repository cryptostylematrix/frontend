import type { TreeNode } from "../../../../services/matrixService";
import "./multi-matrix-tree-grid.css";

import { useEffect, useMemo, useState } from "react";

type Props = {
  node: TreeNode | null;
  onSelect: (node: TreeNode) => void;
};

const placeholderEmptyNode: TreeNode = { kind: "empty", is_next_pos: false, can_buy: false, parent_addr: undefined, locked: false, can_lock: false, is_lock: false, pos: 0 };
const PLACEHOLDER_LEVELS: Array<Array<{ node: TreeNode; pos: number }>> = (() => {
  const result: Array<Array<{ node: TreeNode; pos: number }>> = [];
  let pos = 1;
  for (let depth = 0; depth < 3; depth += 1) {
    const width = 2 ** depth;
    const level: Array<{ node: TreeNode; pos: number }> = [];
    for (let i = 0; i < width; i += 1) {
      level.push({ node: placeholderEmptyNode, pos: pos++ });
    }
    result.push(level);
  }
  return result;
})();

export function MultiMatrixTreeGrid({ node, onSelect }: Props) {
  const [selectedPos, setSelectedPos] = useState<number | undefined>(undefined);

  const levels = useMemo(() => {
    if (!node) return PLACEHOLDER_LEVELS;

    const result: Array<Array<{ node: TreeNode; pos: number }>> = [];
    let counter = 1;
    const queue: Array<{ node: TreeNode; depth: number }> = [{ node: node, depth: 0 }];
    while (queue.length) {
      const { node, depth } = queue.shift()!;
      if (!result[depth]) result[depth] = [];
      const pos = counter++;
      result[depth].push({ node, pos });
      if ("children" in node && node.children) {
        node.children.forEach((child) => {
          if (child) queue.push({ node: child, depth: depth + 1 });
        });
      }
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
            <div key={`level-${levelIndex}`} className="tree-level">
              {level.map(({ node, pos }) => {
                const isSelected = selectedPos === pos;
                const nextClass = node.kind === "empty" && node.is_next_pos ? "node-next" : "";
                const lockedClass = node.kind === "filled" && node.locked ? "node-locked" : "";
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
                      className={`tree-node node-${node.kind} ${nextClass} ${lockedClass} ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <div className="tree-node__login">{node.kind == "filled" ? node.login : "—"}</div>
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

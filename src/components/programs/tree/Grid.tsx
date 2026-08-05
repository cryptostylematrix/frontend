import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ProgramStructure,
  ProgramTreeNode,
} from "../../../services/programApi";
import "./grid.css";

type GridProps = {
  isLoading?: boolean;
  node: ProgramTreeNode | null;
  placeholderConfig?: ProgramStructure;
  onSelect: (node: ProgramTreeNode) => void;
};

type TreeGridItem = {
  node?: ProgramTreeNode;
  pos: number;
  placeholder?: boolean;
};

const UNLIMITED_PLACEHOLDER_WIDTH = 4;

export default function Grid({
  isLoading = false,
  node,
  placeholderConfig,
  onSelect,
}: GridProps) {
  const { t } = useTranslation();
  const [selectedPos, setSelectedPos] = useState<number | undefined>();

  const levels = useMemo(() => {
    if (!node && placeholderConfig) {
      const width =
        placeholderConfig.width === 0
          ? UNLIMITED_PLACEHOLDER_WIDTH
          : Math.max(1, placeholderConfig.width);
      const displayHeight = Number(placeholderConfig.display_height);
      const maxDepth = Number.isFinite(displayHeight)
        ? Math.max(1, displayHeight + 1)
        : 1;
      const result: TreeGridItem[][] = [];
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

    const result: TreeGridItem[][] = [];
    const height = Number(node.height);
    const maxDepth = Number.isFinite(height) ? Math.max(1, height + 1) : 1;
    let counter = 1;
    const queue: Array<{ node: ProgramTreeNode; depth: number }> = [
      { node, depth: 0 },
    ];

    while (queue.length) {
      const current = queue.shift();
      if (!current || current.depth >= maxDepth) continue;
      if (!result[current.depth]) result[current.depth] = [];
      result[current.depth].push({ node: current.node, pos: counter++ });
      current.node.children?.forEach((child) => {
        queue.push({ node: child, depth: current.depth + 1 });
      });
    }

    return result;
  }, [node, placeholderConfig]);

  useEffect(() => {
    setSelectedPos(node ? 1 : undefined);
  }, [node]);

  return (
    <div className="tree-panel">
      <div className="tree-canvas desktop-tree">
        {isLoading ? (
          <div className="tree-loading">
            <span className="tree-loading__spinner" />
          </div>
        ) : !node && !placeholderConfig ? (
          <div className="tree-empty">
            {t("structure.noTreeData", "No tree data")}
          </div>
        ) : (
          <div className="tree-grid">
            {levels.map((level, levelIndex) => (
              <div
                key={`level-${levelIndex}`}
                className="tree-level"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(
                    1,
                    level.length,
                  )}, minmax(0, 1fr))`,
                }}
              >
                {level.map(({ node: itemNode, placeholder, pos }) => {
                  const filled = itemNode?.node_type === "filled";
                  const isSelected = selectedPos === pos;
                  const nodeKind = filled ? "filled" : "empty";
                  const nextClass =
                    itemNode?.node_type === "empty" && itemNode.is_next_pos
                      ? "node-next"
                      : "";
                  const login =
                    itemNode?.node_type === "filled"
                      ? itemNode.profile_addr?.trim()
                        ? itemNode.profile_login ?? "-"
                        : "SC"
                      : "-";

                  return (
                    <div
                      key={pos}
                      className={`tree-node-wrapper ${
                        placeholder ? "is-placeholder" : ""
                      }`}
                      onClick={() => {
                        if (!itemNode) return;
                        onSelect(itemNode);
                        setSelectedPos(pos);
                      }}
                    >
                      <div
                        className={`tree-node node-${nodeKind} ${nextClass} ${
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

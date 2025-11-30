import "./multi-structure-tree.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadRootByLogin, loadChildren, type StructureNode } from "../../../services/structureService";
import { ErrorCode } from "../../../errors/ErrorCodes";

type Props = {
  rootLogin: string;
};

function updateNode(tree: StructureNode, targetId: string, updater: (node: StructureNode) => StructureNode): StructureNode {
  if (tree.id === targetId) {
    return updater(tree);
  }
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children.map((child) => updateNode(child, targetId, updater)),
  };
}

export default function MultiStructureTree({ rootLogin }: Props) {
  const { t } = useTranslation();
  const [root, setRoot] = useState<StructureNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Record<string, boolean>>({});
  const [errorKey, setErrorKey] = useState<{ code: ErrorCode; login: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const login = rootLogin.trim();
    if (!login) {
      setRoot(null);
      setExpanded({});
      setErrorKey(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setRoot(null);
      setExpanded({});
      setErrorKey(null);
      const result = await loadRootByLogin(login);
      if (cancelled) return;
      if (!result.success || !result.node) {
        setErrorKey({ code: ErrorCode.STRUCTURE_ROOT_NOT_FOUND, login });
        setLoading(false);
        return;
      }

      const node = result.node;
      setRoot(node);
      setExpanded({});
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rootLogin]);

  const getLastChildIndex = (node: StructureNode): number => {
    if (!node.children?.length) return 0;
    const last = node.children[node.children.length - 1].index;
    return Number.isFinite(last) ? last : 0;
  };

  const calcToRefNo = (node: StructureNode, lastIdx: number): number => {
    let diff = lastIdx + 10;

    if (node.nextRefNo < diff) {
      diff = node.nextRefNo - lastIdx;
    }

    return diff;
  };

  const handleToggle = async (node: StructureNode) => {
    if (expanded[node.id]) {
      setExpanded((prev) => ({ ...prev, [node.id]: false }));
      return;
    }

    setExpanded((prev) => ({ ...prev, [node.id]: true }));

    if (node.children && node.children.length > 0) return;

    setLoadingNodes((prev) => ({ ...prev, [node.id]: true }));

    const lastIdx = 0;
    const toRefNo = calcToRefNo(node, lastIdx);
    // if (lastIdx === toRefNo) {
    //   setLoadingNodes((prev) => {
    //     const next = { ...prev };
    //     delete next[node.id];
    //     return next;
    //   });
    //   return;
    // }
    const res = await loadChildren(node.id, lastIdx + 1, toRefNo);
    setLoadingNodes((prev) => {
      const next = { ...prev };
      delete next[node.id];
      return next;
    });

    if (!res.success) return;
    setRoot((prev) => {
      if (!prev) return prev;
      return updateNode(prev, node.id, (n) => ({
        ...n,
        children: res.children,
      }));
    });
  };

  const handleLoadMore = async (node: StructureNode) => {
    const lastIdx = getLastChildIndex(node);

    setLoadingNodes((prev) => ({ ...prev, [node.id]: true }));
    const toRefNo = calcToRefNo(node, lastIdx);

    if (toRefNo === lastIdx) {
      setLoadingNodes((prev) => {
        const next = { ...prev };
        delete next[node.id];
        return next;
      });
      return;
    }
    const res = await loadChildren(node.id, lastIdx + 1, toRefNo);
    setLoadingNodes((prev) => {
      const next = { ...prev };
      delete next[node.id];
      return next;
    });
    if (!res.success) return;
    const children = res.children;
    setRoot((prev) => {
      if (!prev) return prev;
      return updateNode(prev, node.id, (n) => ({
        ...n,
        children: [...(n.children ?? []), ...children],
      }));
    });
  };

  const renderNode = (node: StructureNode, level: number, path: number[]) => {
    const hasChildren = !!node.children?.length;
    const isOpen = !!expanded[node.id];
    const created = new Date(node.createdAt).toLocaleString();
    const lastIdx = getLastChildIndex(node);

    const showLoadMore = isOpen && node.nextRefNo > lastIdx + 1;
    const displayIndex = path.join(".");
    return (
      <div key={node.id}>
        <div className="structure-tree-row" style={{ marginLeft: `${level * 18}px` }}>
          {(node.children || node.nextRefNo  > 1) && (
            <button
              type="button"
              className="structure-tree-toggle"
              aria-label={isOpen ? t("multi.structure.collapse", "Collapse") : t("multi.structure.expand", "Expand")}
              onClick={() => handleToggle(node)}
              disabled={!!loadingNodes[node.id]}
            >
              {isOpen ? "−" : "+"}
            </button>
          )}
          <span className="structure-tree-index">{displayIndex}.</span>
          <span className="structure-tree-login">{node.login}</span>
          <span className="structure-tree-meta">created: {created}</span>
          <span className="structure-tree-meta">referals: {node.referals}</span>
        </div>

        {isOpen && hasChildren && node.children!.map((child) => renderNode(child, level + 1, [...path, child.index]))}

        {showLoadMore && (
          <div className="structure-tree-load-more" style={{ marginLeft: `${(level + 1) * 18}px` }}>
            <button
              type="button"
              className="structure-tree-load"
              onClick={() => handleLoadMore(node)}
              disabled={!!loadingNodes[node.id]}
            >
              {loadingNodes[node.id]
                ? t("multi.structure.loading", "Loading...")
                : t("multi.structure.loadMore", "Load more")}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="structure-card__body structure-placeholder">
        {t("multi.structure.loading", "Loading...")}
      </div>
    );
  }

  if (errorKey) {
    return (
      <div className="structure-card__body structure-placeholder">
        {t(`errors.${errorKey.code}`, "Curator {{login}} not found.", { login: errorKey.login })}
      </div>
    );
  }

  if (!root) {
    return (
      <div className="structure-card__body structure-placeholder">
        {t("multi.structure.treePlaceholder", "Tree view will appear here.")}
      </div>
    );
  }

  return (
    <div className="structure-card__body">
      <div className="structure-tree">{renderNode(root, 0, [root.index])}</div>
    </div>
  );
}

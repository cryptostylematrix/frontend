import "./referrals-tree.css";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorCode } from "../../../errors/ErrorCodes";
import {
  loadChildren,
  loadRootByLogin,
  REFERRALS_PAGE_SIZE,
  type StructureNode,
} from "../../../services/referralsService";

type Props = {
  rootLogin: string;
  marketingAddress: string;
  onCuratorSelect?: (login: string) => void;
};

type Pagination = {
  page: number;
  totalPages: number;
};

const formatTimestamp = (value: number | string) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue < 1_000_000_000_000 ? numericValue * 1_000 : numericValue)
    : new Date(value);

  return date.toLocaleString();
};

const updateNode = (
  tree: StructureNode,
  profileAddress: string,
  updater: (node: StructureNode) => StructureNode,
): StructureNode => {
  if (tree.addr === profileAddress) return updater(tree);
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children.map((child) =>
      updateNode(child, profileAddress, updater),
    ),
  };
};

function ReferralsTree({ rootLogin, marketingAddress, onCuratorSelect }: Props) {
  const { t } = useTranslation();
  const [root, setRoot] = useState<StructureNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<Record<string, Pagination>>({});
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Record<string, boolean>>({});
  const [errorKey, setErrorKey] = useState<{ code: ErrorCode; login: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const login = rootLogin.trim();
    if (!login) {
      setRoot(null);
      setExpanded({});
      setPagination({});
      setErrorKey(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setRoot(null);
      setExpanded({});
      setPagination({});
      setErrorKey(null);

      const result = await loadRootByLogin(login, marketingAddress);
      if (cancelled) return;

      if (!result.success || !result.node) {
        setErrorKey({ code: ErrorCode.STRUCTURE_ROOT_NOT_FOUND, login });
      } else {
        setRoot(result.node);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [marketingAddress, rootLogin]);

  const handleToggle = async (node: StructureNode) => {
    const key = node.addr;
    if (expanded[key]) {
      setExpanded((current) => ({ ...current, [key]: false }));
      return;
    }

    setExpanded((current) => ({ ...current, [key]: true }));
    if (node.children || node.filling === 0) return;

    setLoadingNodes((current) => ({ ...current, [key]: true }));
    const result = await loadChildren(
      marketingAddress,
      node.addr,
      1,
      REFERRALS_PAGE_SIZE,
    );
    setLoadingNodes((current) => ({ ...current, [key]: false }));
    if (!result.success) return;

    setPagination((current) => ({
      ...current,
      [key]: { page: result.page, totalPages: result.totalPages },
    }));
    setRoot((current) =>
      current
        ? updateNode(current, key, (target) => ({
            ...target,
            children: result.children,
          }))
        : current,
    );
  };

  const handleLoadMore = async (node: StructureNode) => {
    const key = node.addr;
    const currentPage = pagination[key]?.page ?? 1;
    const nextPage = currentPage + 1;

    setLoadingNodes((current) => ({ ...current, [key]: true }));
    const result = await loadChildren(
      marketingAddress,
      node.addr,
      nextPage,
      REFERRALS_PAGE_SIZE,
    );
    setLoadingNodes((current) => ({ ...current, [key]: false }));
    if (!result.success) return;

    setPagination((current) => ({
      ...current,
      [key]: { page: result.page, totalPages: result.totalPages },
    }));
    setRoot((current) =>
      current
        ? updateNode(current, key, (target) => ({
            ...target,
            children: [...(target.children ?? []), ...result.children],
          }))
        : current,
    );
  };

  const renderNode = (node: StructureNode, level: number) => {
    const key = node.addr;
    const isOpen = Boolean(expanded[key]);
    const hasChildren = Boolean(node.children?.length);
    const page = pagination[key];
    const showLoadMore = isOpen && Boolean(page) && page.page < page.totalPages;
    const displayName = [node.lastName, node.firstName].filter(Boolean).join(" ");
    const telegramUsername = node.tgUsername?.replace(/^@+/, "") ?? "";

    return (
      <div key={key}>
        <div className="structure-tree-row" style={{ marginLeft: `${level * 18}px` }}>
          {node.filling > 0 ? (
            <button
              type="button"
              className="structure-tree-toggle"
              aria-label={isOpen ? t("structure.collapse", "Collapse") : t("structure.expand", "Expand")}
              onClick={() => handleToggle(node)}
              disabled={Boolean(loadingNodes[key])}
            >
              {isOpen ? "−" : "+"}
            </button>
          ) : (
            <span className="structure-tree-toggle-placeholder" aria-hidden />
          )}

          <span className="structure-tree-login">{node.login}</span>
          <span className="structure-tree-meta">
            {t("structure.created", "Created")}: {formatTimestamp(node.createdAt)}
            {displayName && <><br />{displayName}</>}
            {telegramUsername && (
              <>
                <br />
                <a
                  href={`https://t.me/${telegramUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="structure-tree-tg"
                >
                  @{telegramUsername}
                </a>
              </>
            )}
          </span>

          {node.parent_login && (
            <span className="structure-tree-meta">
              {t("structure.curator", "Curator")}: {onCuratorSelect ? (
                <button
                  type="button"
                  className="structure-tree-login structure-tree-curator"
                  onClick={() => onCuratorSelect(node.parent_login!)}
                >
                  {node.parent_login}
                </button>
              ) : node.parent_login}
            </span>
          )}

          <span className="structure-tree-meta">
            {t("structure.referrals", "Referrals")}: {node.filling}
          </span>
        </div>

        {isOpen && hasChildren && node.children!.map((child) => renderNode(child, level + 1))}

        {showLoadMore && (
          <div className="structure-tree-load-more" style={{ marginLeft: `${(level + 1) * 18}px` }}>
            <button
              type="button"
              className="structure-tree-load"
              onClick={() => handleLoadMore(node)}
              disabled={Boolean(loadingNodes[key])}
            >
              {loadingNodes[key]
                ? t("structure.loading", "Loading...")
                : t("structure.loadMore", "Load more")}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="structure-card__body structure-placeholder">{t("structure.loading", "Loading...")}</div>;
  }

  if (errorKey) {
    return (
      <div className="structure-card__body structure-placeholder">
        {t(`errors.${errorKey.code}`, "Curator {{login}} not found.", { login: errorKey.login })}
      </div>
    );
  }

  if (!root) {
    return <div className="structure-card__body structure-placeholder">{t("structure.treePlaceholder", "Tree view will appear here.")}</div>;
  }

  return <div className="structure-card__body"><div className="structure-tree">{renderNode(root, 0)}</div></div>;
}

export default memo(ReferralsTree);

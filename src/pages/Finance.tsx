import "./finance.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../App";
import { useProfileContext } from "../context/ProfileContext";
import ProfileStatusBlock from "../components/ProfileStatusBlock";
import { getProfileNftData, getWalletHistory } from "../services/contractsApi";
import type { TransactionResponse } from "../services/contractsApi";

const PAGE_SIZE = 20;

export default function Finance() {
  console.log("rendering Finance");

  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState("");
  const [profileLogins, setProfileLogins] = useState<Record<string, string | null>>({});
  const pendingProfilesRef = useRef<Set<string>>(new Set());

  const title = <h1>{t("finance.title")}</h1>;

  const rows = useMemo(
    () =>
      transactions.flatMap((transaction) =>
        transaction.messages.map((message, index) => ({
          key: `${transaction.hash}-${transaction.lt}-${index}`,
          date: new Date(transaction.unix_time * 1000).toLocaleDateString(),
          time: new Date(transaction.unix_time * 1000).toLocaleTimeString(),
          addr: message.addr,
          op: message.op,
          comment: message.comment,
          profileAddr: message.profile_addr,
          value: message.value,
        })),
      ),
    [transactions],
  );

  const formatAddr = (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return "";
    if (trimmed.length <= 12) return trimmed;
    return `${trimmed.slice(0, 4)}....${trimmed.slice(-4)}`;
  };

  const formatOp = (value: string) => {
    const normalized = value?.trim();
    if (!normalized) return "";
    return t(`finance.ops.${normalized}`, { defaultValue: normalized });
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedAddr(value);
      window.setTimeout(() => {
        setCopiedAddr((current) => (current === value ? "" : current));
      }, 1500);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const loadHistory = async (lastTransaction?: TransactionResponse) => {
    if (!wallet) return;
    setIsLoading(true);
    const response = await getWalletHistory(wallet, {
      limit: PAGE_SIZE,
      lt: lastTransaction?.lt,
      hash: lastTransaction?.hash,
    });
    const items = response?.items ?? [];
    setTransactions((prev) => {
      if (!lastTransaction) return items;
      const existing = new Set(prev.map((transaction) => `${transaction.hash}-${transaction.lt}`));
      const deduped = items.filter((transaction) => !existing.has(`${transaction.hash}-${transaction.lt}`));
      return [...prev, ...deduped];
    });
    setHasMore(items.length === PAGE_SIZE);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!wallet) return;
    setTransactions([]);
    setHasMore(false);
    void loadHistory();
  }, [wallet]);

  useEffect(() => {
    let isActive = true;
    const profileAddrs = new Set<string>();
    transactions.forEach((transaction) => {
      transaction.messages.forEach((message) => {
        const profileAddr = message.profile_addr?.trim();
        if (profileAddr) profileAddrs.add(profileAddr);
      });
    });

    const missing = Array.from(profileAddrs).filter(
      (addr) => !(addr in profileLogins) && !pendingProfilesRef.current.has(addr),
    );
    if (!missing.length) return;

    missing.forEach((addr) => pendingProfilesRef.current.add(addr));

    void (async () => {
      const entries = await Promise.all(
        missing.map(async (addr) => {
          const response = await getProfileNftData(addr);
          return [addr, response?.content?.login ?? null] as const;
        }),
      );

      if (!isActive) return;
      setProfileLogins((prev) => {
        const next = { ...prev };
        entries.forEach(([addr, login]) => {
          next[addr] = login;
        });
        return next;
      });

      missing.forEach((addr) => pendingProfilesRef.current.delete(addr));
    })();

    return () => {
      isActive = false;
    };
  }, [transactions, profileLogins]);

  // 🪙 Require wallet connection
  if (!wallet) {
    return (
      <>
        {title}
        <ProfileStatusBlock type="wallet" />
      </>
    );
  }

  // 👤 Require active profile
  if (!currentProfile) {
    return (
      <>
        {title}
        <ProfileStatusBlock type="profile" />
      </>
    );
  }

  // ✅ Main content (wallet + profile both available)
  return (
    <>
      {title}
      <div className="finance-transactions">
        <div className="finance-transactions__table">
          <div className="finance-transactions__header">
            <div className="finance-transactions__header-content">
              <div>{t("finance.columns.date")}</div>
              <div>{t("finance.columns.profile")}</div>
              <div>{t("finance.columns.addr")}</div>
              <div>{t("finance.columns.description")}</div>
              <div>{t("finance.columns.value")}</div>
            </div>
          </div>
          {rows.map((row) => (
            <div className="finance-transactions__row" key={row.key}>
              <div className="finance-transactions__row-content">
                <div className="finance-transactions__field">
                  <span className="finance-transactions__label">{t("finance.labels.date_time")}</span>
                  <div className="finance-transactions__date-time">
                    <span>{row.date}</span>
                    <span className="finance-transactions__comment">{row.time}</span>
                  </div>
                </div>
                <div className="finance-transactions__field">
                  <span className="finance-transactions__label">{t("finance.columns.profile")}</span>
                  <span className="finance-transactions__profile" title={row.profileAddr}>
                    {profileLogins[row.profileAddr] ?? "—"}
                  </span>
                </div>
                <div className="finance-transactions__field">
                  <span className="finance-transactions__label">{t("finance.columns.addr")}</span>
                  <span className="finance-transactions__addr" title={row.addr}>
                    <span className="finance-transactions__mono">{formatAddr(row.addr)}</span>
                    <button
                      type="button"
                      className="finance-transactions__copy"
                      onClick={() => void copyToClipboard(row.addr)}
                      aria-label={t("finance.actions.copy_addr")}
                    >
                      {copiedAddr === row.addr ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 16.2l-3.5-3.5L4 14.2l5 5L20 8.2l-1.5-1.4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 9h10v10H9z" />
                          <path d="M5 5h10v2H7v8H5z" />
                        </svg>
                      )}
                    </button>
                  </span>
                </div>
                <div className="finance-transactions__field">
                  <span className="finance-transactions__label">{t("finance.columns.description")}</span>
                  <div className="finance-transactions__op-comment">
                    <span>{formatOp(row.op)}</span>
                    <span className="finance-transactions__comment">{row.comment}</span>
                  </div>
                </div>
                <div className="finance-transactions__field">
                  <span className="finance-transactions__label">{t("finance.columns.value")}</span>
                  <span className={row.value > 0 ? "finance-transactions__value positive" : "finance-transactions__value negative"}>
                    {row.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!rows.length && !isLoading && (
            <div className="finance-transactions__empty">{t("finance.empty")}</div>
          )}
        </div>
        {hasMore && (
          <button
            type="button"
            className="finance-transactions__load-more"
            onClick={() => loadHistory(transactions[transactions.length - 1])}
            disabled={isLoading}
          >
            {isLoading ? t("finance.loading") : t("finance.actions.load_more")}
          </button>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { getUiReport, type ReportFilters,
  type ReportPeriod, type UiReportData } from "../services/uiReportApi";
import ReportPie from "../components/reports/ReportPie";
import { LANGUAGES } from "../languages";
import "./ui-report.css";

const PERIODS: ReportPeriod[] = ["hour", "today", "week", "month", "three_months", "six_months", "year"];

function WalletAddress({ address }: { address: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <span className="report-address">
    <span title={address}>{address.slice(0, 7)}…{address.slice(-7)}</span>
    <button type="button" title={t(copied ? "wallet.addressCopied" : "wallet.copyAddress")}
      aria-label={t(copied ? "wallet.addressCopied" : "wallet.copyAddress")}
      onClick={() => { void navigator.clipboard.writeText(address).then(() => setCopied(true)).catch(() => setCopied(false)); }}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
    <a className="report-explorer" href={`https://tonviewer.com/${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"
      aria-label={t("uiReport.explorer")} title={t("uiReport.explorer")}><ExternalLink size={15} aria-hidden="true" /></a>
  </span>;
}
function Pagination({ page, total, pageSize, loading, onChange }: { page: number; total: number; pageSize: number;
  loading: boolean; onChange: (page: number) => void }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="report-pagination">
    <button type="button" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>{t("uiReport.previous")}</button>
    <span>{t("uiReport.page", { page, pages })}</span>
    <button type="button" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>{t("uiReport.next")}</button>
  </div>;
}

export default function UiReport() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<UiReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>({ profilePage: 1, activityPage: 1,
    period: "week", groupContract: true, groupWalletName: false, groupAppVersion: false, groupPlatform: false });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    void getUiReport(filters, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setError("uiReport.loadError");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh]);

  const numbers = new Intl.NumberFormat(i18n.language);
  const percentages = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const dates = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const formatDate = (value: string) => dates.format(new Date(value));

  return <section className="ui-report">
    <div className="report-heading"><h2 className="administration-section-title">{t("uiReport.title")}</h2>
    </div>
    <p className="report-warning" role="note">{t("uiReport.incompleteDataWarning")}</p>
    {error && <p className="report-error" role="alert">{t(error)}</p>}
    <div className="report-toolbar">
      {loading ? <span className="report-asof" role="status">{t("home.loading")}</span>
        : data && <span className="report-asof">{t("uiReport.asOf", { date: formatDate(data.generated_at) })}</span>}
      <button className="report-refresh" type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>
        <RefreshCw size={14} aria-hidden="true" />{t("uiReport.refresh")}
      </button>
    </div>
      <section className="report-panel" aria-labelledby="report-profiles-title">
        <h2 id="report-profiles-title">{t("uiReport.profilesTitle")}</h2>
        <p className="report-note">{t("uiReport.latestLink")}</p>
        {data && <><div className="report-table-scroll"><table>
          <thead><tr><th>{t("uiReport.wallet")}</th><th>{t("uiReport.profileCount")}</th><th>{t("uiReport.share")}</th></tr></thead>
          <tbody>
            <tr className="report-totals"><th>{t("uiReport.totalWallets", { count: data.profiles.total_wallets })}</th>
              <td>{numbers.format(data.profiles.total_profiles)}</td><td>{data.profiles.total_profiles ? "100%" : "0%"}</td></tr>
            {data.profiles.items.map(row => <tr key={row.wallet_addr}><td><WalletAddress address={row.wallet_addr} /></td>
              <td>{numbers.format(row.profile_count)}</td><td>{percentages.format(row.percentage)}%</td></tr>)}
          </tbody>
        </table></div>
          {!data.profiles.items.length && <p className="report-empty">{t("uiReport.empty")}</p>}
          <Pagination page={data.profiles.page} total={data.profiles.total_wallets} pageSize={data.profiles.page_size} loading={loading}
            onChange={profilePage => setFilters(current => ({ ...current, profilePage }))} /></>}
      </section>
      <section className="report-panel" aria-labelledby="report-ton-title">
        <h2 id="report-ton-title">{t("uiReport.tonTitle")}</h2>
        <fieldset className="report-grouping"><legend>{t("uiReport.groupBy")}</legend>
          {(["groupContract", "groupWalletName", "groupAppVersion", "groupPlatform"] as const).map(key => <label key={key}>
            <input type="checkbox" checked={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.checked }))} />
            {t(`uiReport.${key}`)}</label>)}
        </fieldset>
        {data && <ReportPie title={t("uiReport.tonTitle")} total={data.ton_connect.total} slices={data.ton_connect.groups.map(row => ({
          key: JSON.stringify([row.contract_version, row.wallet_name, row.app_version, row.platform]),
          label: [row.contract_version === "unknown version" ? t("uiReport.unknownVersion") : row.contract_version, row.wallet_name, row.app_version, row.platform]
            .filter(Boolean).join(" · ") || t("uiReport.allWallets"), count: row.count, percentage: row.percentage,
        }))} />}
      </section>
      <section className="report-panel" aria-labelledby="report-activity-title">
        <div className="report-section-heading"><h2 id="report-activity-title">{t("uiReport.activityTitle")}</h2>
          <label className="report-period">{t("uiReport.period")}
            <select value={filters.period} onChange={event => setFilters(current => ({ ...current,
              period: event.target.value as ReportPeriod, activityPage: 1 }))}>
              {PERIODS.map(period => <option key={period} value={period}>{t(`uiReport.periods.${period}`)}</option>)}
            </select></label></div>
        <p className="report-note">{t("uiReport.activityHint")}</p>
        {data && <><p className="report-asof">{formatDate(data.activity.from)} — {formatDate(data.activity.to)}</p>
          <div className="report-table-scroll"><table><thead><tr><th>{t("uiReport.wallet")}</th><th>{t("uiReport.lastConnected")}</th></tr></thead>
            <tbody><tr className="report-totals"><th>{t("uiReport.total")}</th><td>{numbers.format(data.activity.total)}</td></tr>
              {data.activity.items.map(row => <tr key={row.wallet_addr}><td><WalletAddress address={row.wallet_addr} /></td>
                <td><time dateTime={row.last_connected_at}>{formatDate(row.last_connected_at)}</time></td></tr>)}
            </tbody></table></div>
          {!data.activity.items.length && <p className="report-empty">{t("uiReport.empty")}</p>}
          <Pagination page={data.activity.page} total={data.activity.total} pageSize={data.activity.page_size} loading={loading}
            onChange={activityPage => setFilters(current => ({ ...current, activityPage }))} /></>}
      </section>
      <section className="report-panel" aria-labelledby="report-preferences-title">
        <h2 id="report-preferences-title">{t("uiReport.preferencesTitle")}</h2>
        <fieldset className="report-grouping"><legend>{t("uiReport.groupBy")}</legend>
          <label><input type="checkbox" checked disabled />{t("uiReport.language")}</label>
        </fieldset>
        {data && <ReportPie title={t("uiReport.preferencesTitle")} total={data.preferences.total}
          slices={data.preferences.groups.map(row => ({ key: row.language,
            label: LANGUAGES.find(language => language.code === row.language)?.label ?? row.language,
            count: row.count, percentage: row.percentage }))} />}
      </section>
  </section>;
}

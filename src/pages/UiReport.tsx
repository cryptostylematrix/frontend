import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { getProfileReport, getTonConnectReport, getActivityReport, getPreferencesReport,
  type ReportFilters, type ReportPeriod } from "../services/uiReportApi";
import { useReportSection } from "../hooks/useReportSection";
import ReportPie from "../components/reports/ReportPie";
import { LANGUAGES } from "../languages";
import "./ui-report.css";

const REPORT_SECTIONS = [
  { key: "profiles", title: "uiReport.profilesLink" },
  { key: "ton", title: "uiReport.tonTitle" },
  { key: "activity", title: "uiReport.activityLink" },
  { key: "preferences", title: "uiReport.preferencesTitle" },
] as const;
type ReportSection = typeof REPORT_SECTIONS[number]["key"];

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
  const [selected, setSelected] = useState<ReportSection>("profiles");
  const [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>({ profilePage: 1, activityPage: 1,
    period: "week", groupContract: true, groupWalletName: false, groupAppVersion: false, groupPlatform: false });
  const { profilePage, activityPage, period, groupContract, groupWalletName, groupAppVersion, groupPlatform } = filters;
  const profiles = useReportSection(useCallback((signal: AbortSignal) => getProfileReport(profilePage, signal), [profilePage]), refresh, selected === "profiles");
  const ton = useReportSection(useCallback((signal: AbortSignal) => getTonConnectReport({
    groupContract, groupWalletName, groupAppVersion, groupPlatform,
  }, signal), [groupContract, groupWalletName, groupAppVersion, groupPlatform]), refresh, selected === "ton");
  const activity = useReportSection(useCallback((signal: AbortSignal) => getActivityReport(activityPage, period, signal), [activityPage, period]), refresh, selected === "activity");
  const preferences = useReportSection(getPreferencesReport, refresh, selected === "preferences");
  const currentSection = { profiles, ton, activity, preferences }[selected];
  const loading = currentSection.loading;
  const generatedAt = currentSection.updatedAt;
  const status = (section: { loading: boolean; error: boolean }) => <>
    {section.loading && <span className="report-section-loading" role="status">{t("home.loading")}</span>}
    {section.error && <p className="report-error" role="alert">{t("uiReport.loadError")}</p>}
  </>;

  const numbers = new Intl.NumberFormat(i18n.language);
  const percentages = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const dates = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const formatDate = (value: string) => dates.format(new Date(value));

  return <section className="ui-report">
    <div className="report-heading"><h2 className="administration-section-title">{t("uiReport.title")}</h2>
    </div>
    <p className="report-warning" role="note">{t("uiReport.incompleteDataWarning")}</p>
    <nav className="report-submenu" aria-label={t("uiReport.title")}>
      {REPORT_SECTIONS.map(section => <button key={section.key} type="button"
        className={selected === section.key ? "active" : ""}
        aria-current={selected === section.key ? "page" : undefined}
        onClick={() => setSelected(section.key)}>{t(section.title)}</button>)}
    </nav>
    <div className="report-toolbar">
      {generatedAt && <span className="report-asof">{t("uiReport.asOf", { date: formatDate(generatedAt) })}</span>}
      <button className="report-refresh" type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>
        <RefreshCw size={14} aria-hidden="true" />{t("uiReport.refresh")}
      </button>
    </div>
      {selected === "profiles" && <section className="report-panel" aria-labelledby="report-profiles-title" aria-busy={profiles.loading}>
        {status(profiles)}
        <h2 id="report-profiles-title">{t("uiReport.profilesTitle")}</h2>
        <p className="report-note">{t("uiReport.latestLink")}</p>
        {profiles.data && <><div className="report-table-scroll"><table>
          <thead><tr><th>{t("uiReport.wallet")}</th><th>{t("uiReport.profileCount")}</th><th>{t("uiReport.share")}</th></tr></thead>
          <tbody>
            <tr className="report-totals"><th>{t("uiReport.totalWallets", { count: profiles.data.total_wallets })}</th>
              <td>{numbers.format(profiles.data.total_profiles)}</td><td>{profiles.data.total_profiles ? "100%" : "0%"}</td></tr>
            {profiles.data.items.map(row => <tr key={row.wallet_addr}><td><WalletAddress address={row.wallet_addr} /></td>
              <td>{numbers.format(row.profile_count)}</td><td>{percentages.format(row.percentage)}%</td></tr>)}
          </tbody>
        </table></div>
          {!profiles.data.items.length && <p className="report-empty">{t("uiReport.empty")}</p>}
          <Pagination page={profiles.data.page} total={profiles.data.total_wallets} pageSize={profiles.data.page_size} loading={profiles.loading}
            onChange={profilePage => setFilters(current => ({ ...current, profilePage }))} /></>}
      </section>}
      {selected === "ton" && <section className="report-panel" aria-labelledby="report-ton-title" aria-busy={ton.loading}>
        {status(ton)}
        <h2 id="report-ton-title">{t("uiReport.tonTitle")}</h2>
        <fieldset className="report-grouping"><legend>{t("uiReport.groupBy")}</legend>
          {(["groupContract", "groupWalletName", "groupAppVersion", "groupPlatform"] as const).map(key => <label key={key}>
            <input type="checkbox" checked={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.checked }))} />
            {t(`uiReport.${key}`)}</label>)}
        </fieldset>
        {ton.data && <ReportPie title={t("uiReport.tonTitle")} total={ton.data.total} slices={ton.data.groups.map(row => ({
          key: JSON.stringify([row.contract_version, row.wallet_name, row.app_version, row.platform]),
          label: [row.contract_version === "unknown version" ? t("uiReport.unknownVersion") : row.contract_version, row.wallet_name, row.app_version, row.platform]
            .filter(Boolean).join(" · ") || t("uiReport.allWallets"), count: row.count, percentage: row.percentage,
        }))} />}
      </section>}
      {selected === "activity" && <section className="report-panel" aria-labelledby="report-activity-title" aria-busy={activity.loading}>
        {status(activity)}
        <div className="report-section-heading"><h2 id="report-activity-title">{t("uiReport.activityTitle")}</h2>
          <label className="report-period">{t("uiReport.period")}
            <select value={filters.period} onChange={event => setFilters(current => ({ ...current,
              period: event.target.value as ReportPeriod, activityPage: 1 }))}>
              {PERIODS.map(period => <option key={period} value={period}>{t(`uiReport.periods.${period}`)}</option>)}
            </select></label></div>
        <p className="report-note">{t("uiReport.activityHint")}</p>
        {activity.data && <><p className="report-asof">{formatDate(activity.data.from)} — {formatDate(activity.data.to)}</p>
          <div className="report-table-scroll"><table><thead><tr><th>{t("uiReport.wallet")}</th><th>{t("uiReport.lastConnected")}</th></tr></thead>
            <tbody><tr className="report-totals"><th>{t("uiReport.total")}</th><td>{numbers.format(activity.data.total)}</td></tr>
              {activity.data.items.map(row => <tr key={row.wallet_addr}><td><WalletAddress address={row.wallet_addr} /></td>
                <td><time dateTime={row.last_connected_at}>{formatDate(row.last_connected_at)}</time></td></tr>)}
            </tbody></table></div>
          {!activity.data.items.length && <p className="report-empty">{t("uiReport.empty")}</p>}
          <Pagination page={activity.data.page} total={activity.data.total} pageSize={activity.data.page_size} loading={activity.loading}
            onChange={activityPage => setFilters(current => ({ ...current, activityPage }))} /></>}
      </section>}
      {selected === "preferences" && <section className="report-panel" aria-labelledby="report-preferences-title" aria-busy={preferences.loading}>
        {status(preferences)}
        <h2 id="report-preferences-title">{t("uiReport.preferencesTitle")}</h2>
        <fieldset className="report-grouping"><legend>{t("uiReport.groupBy")}</legend>
          <label><input type="checkbox" checked disabled />{t("uiReport.language")}</label>
        </fieldset>
        {preferences.data && <ReportPie title={t("uiReport.preferencesTitle")} total={preferences.data.total}
          slices={preferences.data.groups.map(row => ({ key: row.language,
            label: LANGUAGES.find(language => language.code === row.language)?.label ?? row.language,
            count: row.count, percentage: row.percentage }))} />}
      </section>}
  </section>;
}

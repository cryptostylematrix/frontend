import { useState } from "react";
import { useTranslation } from "react-i18next";

export type PieSlice = { key: string; label: string; count: number; percentage: number };
function slicePath(start: number, fraction: number): string {
  const point = (value: number) => [130 + 116 * Math.cos(value * 2 * Math.PI - Math.PI / 2),
    130 + 116 * Math.sin(value * 2 * Math.PI - Math.PI / 2)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(start + fraction);
  return `M 130 130 L ${x1} ${y1} A 116 116 0 ${fraction > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
}
export default function ReportPie({ title, total, slices }: { title: string; total: number; slices: PieSlice[] }) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const labels = slices.map(slice => `${slice.label}: ${number.format(slice.count)} (${percent.format(slice.percentage)}%)`);
  const colors = slices.map((_, index) => `hsl(${(index * 137.508 + 35) % 360} 58% 43%)`);
  let offset = 0;
  return <div className="report-chart">
    <p className="report-chart-total">{t("uiReport.total")}: <strong>{number.format(total)}</strong></p>
    {!total ? <p className="report-empty">{t("uiReport.empty")}</p> : <div className="report-chart-content">
      <svg viewBox="0 0 260 260" role="img" aria-label={title} className="report-pie">
        <title>{title}</title>
        {slices.map((slice, index) => {
          const fraction = slice.count / total;
          const path = slicePath(offset, fraction);
          offset += fraction;
          const props = { fill: colors[index], opacity: active && active !== slice.key ? 0.4 : 1,
            onMouseEnter: () => setActive(slice.key), onMouseLeave: () => setActive(null) };
          return fraction === 1
            ? <circle key={slice.key} cx="130" cy="130" r="116" {...props}><title>{labels[index]}</title></circle>
            : <path key={slice.key} d={path} {...props}><title>{labels[index]}</title></path>;
        })}
      </svg>
      <ul className="report-legend" aria-label={title}>
        {slices.map((slice, index) => <li key={slice.key}>
          <button type="button" className={active === slice.key ? "is-active" : ""}
            onMouseEnter={() => setActive(slice.key)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(slice.key)} onBlur={() => setActive(null)} aria-label={labels[index]}>
            <span className="report-swatch" style={{ backgroundColor: colors[index] }} aria-hidden="true" />
            <span className="report-legend-label">{slice.label}</span>
            <strong>{number.format(slice.count)}</strong><span>{percent.format(slice.percentage)}%</span>
          </button>
        </li>)}
      </ul>
    </div>}
  </div>;
}

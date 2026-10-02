import { useTranslation } from "react-i18next";
import type { Program } from "../../services/programsService";

const featureKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const safeLink = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export default function ProgramSpecificationMetadata({ program }: { program: Program | null }) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().split("-")[0];
  const s = (key: string) => t(`specification.${key}`);
  const number = (value: number) => new Intl.NumberFormat(language).format(value);
  const pdf = safeLink(program?.presentations.pdf[language] || program?.presentations.pdf.en);
  const video = safeLink(program?.presentations.video[language] || program?.presentations.video.en);
  const image = safeLink(program?.image);
  return <section className="program-specification__section" id="spec-metadata" aria-labelledby="spec-metadata-title">
    <h3 id="spec-metadata-title">{s("metadataTitle")}</h3>
    <p className="program-specification__section-description">{s("metadataSource")}</p>
    {!program ? <p className="program-specification__muted">{s("metadataUnavailable")}</p> : <>
      <div className="program-specification__table" role="region" aria-labelledby="spec-metadata-title" tabIndex={0}>
        <table className="program-specification__metadata"><tbody>
          <tr><th scope="row">{s("metadataName")}</th><td><div className="program-specification__metadata-name">
            {image && <img src={image} alt={t("programs.metadata.imageAlt", { name: program.name })} width={48} height={48} loading="lazy" />}
            <strong>{program.name}</strong>
          </div></td></tr>
          {program.creatorTg && <tr><th scope="row">{t("home.programs.creatorLabel")}</th><td><a href={`https://t.me/${encodeURIComponent(program.creatorTg)}`} target="_blank" rel="noreferrer">@{program.creatorTg}</a></td></tr>}
          {program.features.length > 0 && <tr><th scope="row">{s("metadataFeatures")}</th><td>{program.features.map(feature => t(`programs.metadata.features.${featureKey(feature)}`, { defaultValue: feature })).join(" · ")}</td></tr>}
          {program.platforms !== null && <tr><th scope="row">{s("metadataPlatforms")}</th><td>{program.platforms}</td></tr>}
          {program.entry && <tr><th scope="row">{t("programs.metadata.entry")}</th><td>{t(program.entry.kind === "fixed" ? "programs.metadata.entryAmountFixed" : "programs.metadata.entryAmount", { amount: `${number(program.entry.value)} ${program.entry.currency}`, currency: "" })}</td></tr>}
          {program.incomes.length > 0 && <tr><th scope="row">{s("metadataIncome")}</th><td>{program.incomes.map((income, index) => <div key={index}>
            {t(income.kind === "minimum" ? "specification.metadataIncomeMinimum" : "programs.metadata.exitAmount", {
              amount: `${number(income.value)} ${income.currency}`, currency: "",
              period: t(`programs.metadata.periods.${featureKey(income.period)}`, { defaultValue: income.period }),
            })}
          </div>)}</td></tr>}
          {(pdf || video) && <tr><th scope="row">{s("metadataMaterials")}</th><td><div className="program-specification__metadata-links">
            {pdf && <a href={pdf} target="_blank" rel="noreferrer">{t("programs.presentation.pdfTitle")}</a>}
            {video && <a href={video} target="_blank" rel="noreferrer">{t("programs.presentation.videoTitle")}</a>}
          </div></td></tr>}
        </tbody></table>
      </div>
    </>}
  </section>;
}

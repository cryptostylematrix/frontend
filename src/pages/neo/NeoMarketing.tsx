import "./neo-marketing.css";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGS = ["de", "en", "es", "fr", "hu", "it", "kk", "pl", "pt", "ru", "uk"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const videoLinks: Record<SupportedLang, string> = {
  de: "https://youtu.be/au6XJvQKjtk",
  en: "https://youtu.be/atDC1yaX3FE",
  es: "https://youtu.be/JJVDfH4xmSk",
  fr: "https://youtu.be/92bcDgHHxl4",
  hu: "https://youtu.be/ngQFdv2bBEI",
  it: "https://youtu.be/weTpAF-uB-Y",
  kk: "https://youtu.be/SRANvbu9Xlw",
  pl: "https://youtu.be/JxPTfBQ1Thg",
  pt: "https://youtu.be/NrThOrOo8-I",
  ru: "https://youtu.be/SRANvbu9Xlw",
  uk: "https://youtu.be/J4USmRWQ6QE",
};

export default function NeoMarketing() {
  const { t, i18n } = useTranslation();

  const lang = (i18n.language || "en").split("-")[0] as SupportedLang | string;
  const pdfLang: SupportedLang = SUPPORTED_LANGS.includes(lang as SupportedLang) ? (lang as SupportedLang) : "en";

  const base = import.meta.env.BASE_URL || "/";
  const pdfHref = `${base}Neo-Club_${pdfLang}.pdf`;
  const videoHref = videoLinks[pdfLang] || videoLinks.en;

  return (
    <section className="neo-marketing">
      <div className="marketing-grid">
        <div className="marketing-card">
          <div className="marketing-card__header">{t("neo.marketing.pdfTitle", "Presentation PDF")}</div>
          <p className="marketing-card__text">
            {t("neo.marketing.pdfDescription", "Preview the deck in your language.")}
          </p>
          <a className="btn link" href={pdfHref} target="_blank" rel="noreferrer">
            {t("neo.marketing.view", "View PDF")}
          </a>
        </div>

        <div className="marketing-card">
          <div className="marketing-card__header">{t("neo.marketing.videoTitle", "Video overview")}</div>
          <p className="marketing-card__text">
            {t("neo.marketing.videoDescription", "Watch the marketing overview on YouTube.")}
          </p>
          <a className="btn link" href={videoHref} target="_blank" rel="noreferrer">
            {t("neo.marketing.watch", "Watch video")}
          </a>
        </div>
      </div>
    </section>
  );
}

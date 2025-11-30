import "./multi-marketing.css";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGS = ["en", "hu", "it", "kk", "pl", "ru", "uk"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const videoLinks: Record<SupportedLang, string> = {
  ru: "https://youtu.be/AcHttS57cGo",
  hu: "https://youtu.be/FJQsnZ2vgIQ",
  en: "https://youtu.be/plxxqhkToJY",
  it: "https://youtu.be/5kjwWmcLu6U",
  pl: "https://youtu.be/ONQ4o_b09uY",
  kk: "https://youtu.be/plxxqhkToJY",
  uk: "https://youtu.be/plxxqhkToJY",
};

export default function MultiMarketing() {
  const { t, i18n } = useTranslation();

  const lang = (i18n.language || "en").split("-")[0] as SupportedLang | string;
  const pdfLang: SupportedLang = SUPPORTED_LANGS.includes(lang as SupportedLang) ? (lang as SupportedLang) : "en";

  const base = import.meta.env.BASE_URL || "/";
  const pdfHref = `${base}marketing-${pdfLang}.pdf`;
  const videoHref = videoLinks[pdfLang] || videoLinks.en;

  return (
    <section className="multi-marketing">
      <div className="marketing-grid">
        <div className="marketing-card">
          <div className="marketing-card__header">{t("multi.marketing.pdfTitle", "Presentation PDF")}</div>
          <p className="marketing-card__text">
            {t("multi.marketing.pdfDescription", "Preview the deck in your language.")}
          </p>
          <a className="btn link" href={pdfHref} target="_blank" rel="noreferrer">
            {t("multi.marketing.view", "View PDF")}
          </a>
        </div>

        <div className="marketing-card">
          <div className="marketing-card__header">{t("multi.marketing.videoTitle", "Video overview")}</div>
          <p className="marketing-card__text">
            {t("multi.marketing.videoDescription", "Watch the marketing overview on YouTube.")}
          </p>
          <a className="btn link" href={videoHref} target="_blank" rel="noreferrer">
            {t("multi.marketing.watch", "Watch video")}
          </a>
        </div>
      </div>
    </section>
  );
}

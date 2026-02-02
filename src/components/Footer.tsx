import "./footer.css";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const copyright = t("footer.copyright", { year: currentYear });
  const supportedLangs = ["en", "ru", "uk", "kk", "hu", "it", "pl"] as const;
  const language = i18n.language?.split(/[-_]/)[0] ?? "en";
  const resolvedLang = supportedLangs.includes(language as (typeof supportedLangs)[number]) ? language : "en";
  const baseUrl = import.meta.env.BASE_URL || "/";
  const privacyHref = `${baseUrl}privacy-policy_crypto-style_${resolvedLang}.pdf`;
  const agreementHref = `${baseUrl}user-agreement_crypto-style_${resolvedLang}.pdf`;

  return (
    <footer className="footer">
      <div className="footer-content">
        <nav className="footer-links" aria-label="Footer navigation">
          <a
            href="https://t.me/CryptoStyleMatrixNews"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.news", { defaultValue: "News" })}
          </a>
          <a
            href="https://t.me/CryptoStyleMatrixbot"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.group", { defaultValue: "Community" })}
          </a>
          <a
            href="https://www.youtube.com/@CryptoStyleOfficial"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.youtube", { defaultValue: "YouTube" })}
          </a>
          <a
            href="https://x.com/CryptoStyleTON"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.twitter", { defaultValue: "Twitter" })}
          </a>
          <a
            href={privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.privacy")}
          </a>
          <a
            href={agreementHref}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.agreement")}
          </a>
        </nav>

        <div className="footer-copy">
          {copyright}
        </div>
      </div>
    </footer>
  );
}

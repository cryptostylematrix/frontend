import { Link } from "react-router-dom";
import "./footer.css";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const copyright = t("footer.copyright", { year: currentYear });

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
          <Link to="/privacy" className="footer-link">
            {t("footer.privacy")}
          </Link>
          <Link to="/user-agreement" className="footer-link">
            {t("footer.agreement")}
          </Link>
        </nav>

        <div className="footer-copy">
          {copyright}
        </div>
      </div>
    </footer>
  );
}

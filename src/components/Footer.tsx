import { Link } from "react-router-dom";
import "./footer.css";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <nav className="footer-links" aria-label="Footer navigation">
          <a
            href="https://t.me/yourchannel"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("footer.channel")}
          </a>
          <Link to="/privacy" className="footer-link">
            {t("footer.privacy")}
          </Link>
          <Link to="/user-agreement" className="footer-link">
            {t("footer.agreement")}
          </Link>
        </nav>

        <div className="footer-copy">
          © {currentYear} {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}

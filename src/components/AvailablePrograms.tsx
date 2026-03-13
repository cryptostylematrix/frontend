import "./available-programs.css";
import { PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function AvailablePrograms() {
  const { t } = useTranslation();

  return (
    <section className="programs-section" aria-labelledby="programs-title">
      <div className="programs-header">
        <h2 id="programs-title" className="programs-title">
          {t("home.programs.title")}
        </h2>
      </div>

      <div className="programs-grid">
        <article className="program-card">
          <div className="program-card__top">
            <img
              src={`${import.meta.env.BASE_URL}cs-big.png`}
              alt={t("home.programs.multi.imageAlt")}
              className="program-card__image"
            />

            <div className="program-card__header">
              <h3 className="program-card__title">{t("home.programs.multi.name")}</h3>
              <div className="program-card__meta">
                <span className="program-card__creator">
                  <PenTool className="program-card__creator-icon-svg" aria-hidden="true" />
                  {t("home.programs.multi.creator")}
                </span>
                <a
                  href="https://t.me/cryptostylematrix"
                  target="_blank"
                  rel="noreferrer"
                  className="program-card__creator-link"
                >
                  @cryptostylematrix
                </a>
              </div>
            </div>
          </div>

          <div className="program-card__content">
            <div className="program-card__tags">
              <span className="program-card__tag">{t("home.programs.multi.features.platforms")}</span>
              <span className="program-card__tag">{t("home.programs.multi.features.reinvest")}</span>
              <span className="program-card__tag">{t("home.programs.multi.features.clones")}</span>
              <span className="program-card__tag">{t("home.programs.multi.features.structure")}</span>
            </div>

            <div className="program-card__footer">
              <div className="program-card__price">
                <span>{t("home.programs.multi.pricing.entryLabel")}</span>{" "}
                <span className="program-card__price-amount">
                  {t("home.programs.multi.pricing.entryAmount")}
                </span>
                <span className="program-card__price-separator"> · </span>
                <span>{t("home.programs.multi.pricing.exitLabel")}</span>{" "}
                <span className="program-card__price-amount">
                  {t("home.programs.multi.pricing.exitAmount")}
                </span>
              </div>
              <Link to="/multi" className="program-card__button">
                {t("home.programs.open")}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

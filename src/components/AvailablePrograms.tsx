import "./available-programs.css";
import { PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ProgramBlock from "./ProgramBlock";
import {
  CRYPTOCASH_MARKETING_PROGRAM_ADDRESS,
  MULTI_MARKETING_PROGRAM_ADDRESS,
  NEO_MARKETING_PROGRAM_ADDRESS,
} from "../programs";
const SHOW_LEGACY_PROGRAMS = false;
const SHOW_MULTI_AND_NEO = true;

export default function AvailablePrograms() {
  const { t } = useTranslation();
  const legacyPrograms = [
    {
      key: "neo",
      href: "/neo",
      image: "neoclub.png",
      creatorLink: "https://t.me/neoclubmatrix",
      creatorHandle: "@neoclubmatrix",
      features: ["platforms", "linear", "tetra", "clones", "structure"],
    },
  ] as const;

  return (
    <>
      <section className="programs-section" aria-labelledby="programs-title">
        <div className="programs-header">
          <h2 id="programs-title" className="programs-title">
            {t("home.programs.title")}
          </h2>
        </div>

        <div className="programs-grid">
          {SHOW_MULTI_AND_NEO && (
            <>
              <ProgramBlock marketingAddress={MULTI_MARKETING_PROGRAM_ADDRESS} />
              <ProgramBlock marketingAddress={NEO_MARKETING_PROGRAM_ADDRESS} />
            </>
          )}
          <ProgramBlock
            marketingAddress={CRYPTOCASH_MARKETING_PROGRAM_ADDRESS}
          />
        </div>
      </section>

      {SHOW_LEGACY_PROGRAMS && (
        <section
          className="programs-section"
          aria-labelledby="legacy-programs-title"
        >
        <div className="programs-header">
          <h2 id="legacy-programs-title" className="programs-title">
            {t("home.programs.legacyTitle", "Legacy Programs")}
          </h2>
        </div>

        <div className="programs-grid">
          {legacyPrograms.map((program) => (
          <article className="program-card" key={program.key}>
            <div className="program-card__top">
              <img
                src={`${import.meta.env.BASE_URL}${program.image}`}
                alt={t(`home.programs.${program.key}.imageAlt`)}
                className="program-card__image"
              />

              <div className="program-card__header">
                <h3 className="program-card__title">{t(`home.programs.${program.key}.name`)}</h3>
                <div className="program-card__meta">
                  <span className="program-card__creator">
                    <PenTool className="program-card__creator-icon-svg" aria-hidden="true" />
                    {t(`home.programs.${program.key}.creator`)}
                  </span>
                  <a
                    href={program.creatorLink}
                    target="_blank"
                    rel="noreferrer"
                    className="program-card__creator-link"
                  >
                    {program.creatorHandle}
                  </a>
                </div>
              </div>
            </div>

            <div className="program-card__content">
              <div className="program-card__tags">
                {program.features.map((feature) => (
                  <span className="program-card__tag" key={feature}>
                    {t(`home.programs.${program.key}.features.${feature}`)}
                  </span>
                ))}
              </div>

              <div className="program-card__footer">
                <div className="program-card__price">
                  <span>{t(`home.programs.${program.key}.pricing.entryLabel`)}</span>{" "}
                  <span className="program-card__price-amount">
                    {t(`home.programs.${program.key}.pricing.entryAmount`)}
                  </span>
                  <span className="program-card__price-separator"> · </span>
                  <span>{t(`home.programs.${program.key}.pricing.exitLabel`)}</span>{" "}
                  <span className="program-card__price-amount">
                    {t(`home.programs.${program.key}.pricing.exitAmount`)}
                  </span>
                </div>
                <Link to={program.href} className="program-card__button">
                  {t("home.programs.open")}
                </Link>
              </div>
            </div>
          </article>
          ))}
        </div>
        </section>
      )}
    </>
  );
}

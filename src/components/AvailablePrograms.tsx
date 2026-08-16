import "./available-programs.css";
import { PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ProgramBlock from "./ProgramBlock";

export const CRYPTOCASH_MARKETING_PROGRAM_ADDRESS =
  "EQAba1dNyAbxm4t_dv5T1ARQXaQAAYcfJ4jcAWcw1PQ7q10b";
export const MULTI_MARKETING_PROGRAM_ADDRESS =
  "EQBti82_Lya2Wz-iAwuFDH-vdoT0N1RfiBjkrnbhFbkc2Wfu";
export const NEO_MARKETING_PROGRAM_ADDRESS =
  "EQCQUF6o3Z_SzFD5m9aR6uGbIgaujaUcHTPX9oghh8O4lMYh";
const SHOW_LEGACY_PROGRAMS = false;
const SHOW_MULTI_AND_NEO = false;

export default function AvailablePrograms() {
  const { t } = useTranslation();
  const legacyPrograms = [
    {
      key: "multi",
      href: "/multi",
      image: "cs-big.png",
      creatorLink: "https://t.me/cryptostylematrix",
      creatorHandle: "@cryptostylematrix",
      features: ["platforms", "reinvest", "clones", "structure"],
    },
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

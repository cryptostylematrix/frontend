import { useEffect, useState } from "react";
import { PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appConfig } from "../config";
import { loadPrograms, type Program } from "../services/programsService";
import "./available-programs.css";
import "./available-test-programs.css";

const featureKey = (feature: string) =>
  feature.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

const currencySymbol = (currency: string) => {
  switch (currency.trim().toUpperCase()) {
    case "USD":
    case "USDT":
    case "USDC":
      return "$";
    case "EUR":
      return "€";
    default:
      return currency.trim().toUpperCase();
  }
};

export default function AvailableTestPrograms() {
  const { t, i18n } = useTranslation();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    loadPrograms(appConfig.ton.admin.dev)
      .then((loadedPrograms) => {
        if (active) setPrograms(loadedPrograms);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language).format(value);

  return (
    <section
      className="test-programs programs-section"
      aria-labelledby="test-programs-title"
    >
      <h2 id="test-programs-title" className="test-programs__title">
        {t("programs.availableTestPrograms", "Available Test Programs")}
      </h2>
      {isLoading && (
        <div className="test-programs__loading">{t("home.loading")}</div>
      )}
      <div className="programs-grid">
        {programs.map((program) => {
          const highestIncome = program.incomes.reduce(
            (highest, income) =>
              !highest || income.value > highest.value ? income : highest,
            program.incomes[0],
          );

          return (
            <article className="program-card" key={program.address}>
              <div className="program-card__top">
                {program.image ? (
                  <img
                    src={program.image}
                    alt={t("programs.metadata.imageAlt", {
                      name: program.name,
                      defaultValue: "{{name}} program",
                    })}
                    className="program-card__image"
                  />
                ) : (
                  <div
                    className="program-card__image program-card__image--placeholder"
                    aria-hidden="true"
                  />
                )}

                <div className="program-card__header">
                  <h3 className="program-card__title">{program.name}</h3>
                  {program.creatorTg && (
                    <a
                      href={`https://t.me/${encodeURIComponent(program.creatorTg)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="program-card__creator-link program-card__creator-link--metadata"
                    >
                      <PenTool
                        className="program-card__creator-icon-svg"
                        aria-hidden="true"
                      />
                      @{program.creatorTg}
                    </a>
                  )}
                </div>
              </div>

              <div className="program-card__content">
                <div className="program-card__tags">
                  {program.platforms !== null && (
                    <span className="program-card__tag">
                      {t("programs.metadata.platforms", {
                        count: program.platforms,
                        defaultValue: "{{count}} levels",
                      })}
                    </span>
                  )}
                  {program.features.map((feature) => (
                    <span className="program-card__tag" key={feature}>
                      {t(`programs.metadata.features.${featureKey(feature)}`, {
                        defaultValue: feature,
                      })}
                    </span>
                  ))}
                </div>

                <div className="program-card__footer">
                  {(program.entry || highestIncome) && (
                    <div className="program-card__price">
                      {program.entry && (
                        <>
                          <span>{t("programs.metadata.entry", "Entry")}</span>{" "}
                          <span className="program-card__price-amount">
                            {t("programs.metadata.entryAmount", {
                              amount: formatNumber(program.entry.value),
                              currency: currencySymbol(program.entry.currency),
                              defaultValue: "from {{currency}}{{amount}}",
                            })}
                          </span>
                        </>
                      )}
                      {program.entry && highestIncome && (
                        <span className="program-card__price-separator"> · </span>
                      )}
                      {highestIncome && (
                        <>
                          <span>{t("programs.metadata.exit", "Exit")}</span>{" "}
                          <span className="program-card__price-amount">
                            {t("programs.metadata.exitAmount", {
                              amount: formatNumber(highestIncome.value),
                              currency: currencySymbol(highestIncome.currency),
                              period: t(
                                `programs.metadata.periods.${featureKey(highestIncome.period)}`,
                                highestIncome.period,
                              ),
                              defaultValue:
                                "up to {{currency}}{{amount}} per {{period}}",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <Link
                    className="program-card__button"
                    to={`/programs/${encodeURIComponent(program.address)}/inviter`}
                  >
                    {t("programs.open", "Open")}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

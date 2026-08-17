import { useEffect, useState } from "react";
import { ExternalLink, PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  loadProgramMetadata,
  type Program,
} from "../services/programsService";
import { getLegacyPricingProgramKey } from "../programs";
import "./available-programs.css";
import "./program-block.css";

type Props = {
  marketingAddress: string;
};

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

export default function ProgramBlock({ marketingAddress }: Props) {
  const { t, i18n } = useTranslation();
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgram(null);

    void loadProgramMetadata(marketingAddress).then((metadata) => {
      if (!cancelled) setProgram(metadata);
    });

    return () => {
      cancelled = true;
    };
  }, [marketingAddress]);

  if (!program) return null;

  const highestIncome = program.incomes.reduce(
    (highest, income) =>
      !highest || income.value > highest.value ? income : highest,
    program.incomes[0],
  );
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language).format(value);
  const legacyPricingKey = getLegacyPricingProgramKey(marketingAddress);

  return (
    <article className="program-card">
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
          <div className="program-card__title-row">
            <h3 className="program-card__title">{program.name}</h3>
            <a
              className="program-card__explorer-link"
              href={`https://tonviewer.com/${encodeURIComponent(marketingAddress)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={t(
                "programs.contractExplorer",
                "Open contract in explorer",
              )}
              title={t(
                "programs.contractExplorer",
                "Open contract in explorer",
              )}
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
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
          {legacyPricingKey ? (
            <div className="program-card__price">
              <span>
                {t(`home.programs.${legacyPricingKey}.pricing.entryLabel`)}
              </span>{" "}
              <span className="program-card__price-amount">
                {t(`home.programs.${legacyPricingKey}.pricing.entryAmount`)}
              </span>
              <span className="program-card__price-separator"> · </span>
              <span>
                {t(`home.programs.${legacyPricingKey}.pricing.exitLabel`)}
              </span>{" "}
              <span className="program-card__price-amount">
                {t(`home.programs.${legacyPricingKey}.pricing.exitAmount`)}
              </span>
            </div>
          ) : (program.entry || highestIncome) ? (
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
          ) : null}
          <Link
            className="program-card__button"
            to={`/programs/${encodeURIComponent(marketingAddress)}/inviter`}
          >
            {t("programs.open", "Open")}
          </Link>
        </div>
      </div>
    </article>
  );
}

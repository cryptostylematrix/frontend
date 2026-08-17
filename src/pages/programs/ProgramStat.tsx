import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Address } from "@ton/core";
import { WalletContext } from "../../App";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { useProfileContext } from "../../context/ProfileContext";
import { useProgramContext } from "../../context/ProgramContext";
import { getMarketingV3Data } from "../../services/contractsApi";
import {
  getProgramStatistics,
  type ProgramStatistics,
  type ReferralCountStatistics,
} from "../../services/programApi";
import { loadProgramMetadata } from "../../services/programsService";
import { CRYPTOCASH_MARKETING_PROGRAM_ADDRESS } from "../../programs";
import "./program-stat.css";

type LoadState = "loading" | "ready" | "not-found" | "error";

function ReferralMetrics({
  referrals,
}: {
  referrals: ReferralCountStatistics;
}) {
  const { t, i18n } = useTranslation();
  const formatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );

  return (
    <div className="program-stat__metrics">
      <div className="program-stat__metric program-stat__metric--active">
        <span>{t("programs.statisticsPage.activeReferrals")}</span>
        <strong>{formatter.format(referrals.active)}</strong>
      </div>
      <div className="program-stat__metric program-stat__metric--inactive">
        <span>{t("programs.statisticsPage.inactiveReferrals")}</span>
        <strong>{formatter.format(referrals.inactive)}</strong>
      </div>
    </div>
  );
}

const isCryptoCashAddress = (address: string) => {
  try {
    return (
      Address.parse(address).toRawString() ===
      Address.parse(CRYPTOCASH_MARKETING_PROGRAM_ADDRESS).toRawString()
    );
  } catch {
    return false;
  }
};

export default function ProgramStat() {
  const { t, i18n } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const [statistics, setStatistics] = useState<ProgramStatistics | null>(null);
  const [structureNames, setStructureNames] = useState<Record<number, string>>(
    {},
  );
  const [programName, setProgramName] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!wallet || !currentProfile?.address || !marketingAddress) return;

    let cancelled = false;
    setStatistics(null);
    setStructureNames({});
    setProgramName("");
    setLoadState("loading");

    void Promise.all([
      getProgramStatistics(marketingAddress, currentProfile.address),
      getMarketingV3Data(marketingAddress),
      loadProgramMetadata(marketingAddress),
    ])
      .then(([data, marketingData, metadata]) => {
        if (cancelled) return;
        if (!data) {
          setLoadState("not-found");
          return;
        }

        setStructureNames(
          Object.fromEntries(
            Object.entries(marketingData?.structures ?? {})
              .map(([number, structure]) => [
                Number(number),
                structure.name.trim(),
              ])
              .filter(
                ([number, name]) =>
                  Number.isFinite(number) && typeof name === "string" && name,
              ),
          ),
        );
        setProgramName(metadata?.name.trim() ?? "");
        setStatistics(data);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error("Failed to load program statistics", error);
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile?.address, marketingAddress, wallet]);

  const formatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );

  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  if (loadState === "loading") {
    return <div className="program-stat__status">{t("home.loading")}</div>;
  }

  if (loadState === "not-found") {
    return (
      <div className="program-stat__status program-stat__status--empty">
        {t("programs.statisticsPage.notRegistered")}
      </div>
    );
  }

  if (loadState === "error" || !statistics) {
    return (
      <div className="program-stat__status program-stat__status--error" role="alert">
        {t("programs.statisticsPage.loadError")}
      </div>
    );
  }

  const structures = [...statistics.structures].sort(
    (left, right) => left.structure_number - right.structure_number,
  );
  const referralStructure = structures.find(
    (structure) => structure.structure_number === 0,
  );
  const otherStructures = structures.filter(
    (structure) => structure.structure_number !== 0,
  );
  const showLevelStatistics = isCryptoCashAddress(marketingAddress);

  const renderLevel = (
    structure: ProgramStatistics["structures"][number],
  ) => (
    <article
      className="program-stat__card program-stat__structure"
      key={structure.structure_number}
    >
      <h2>
        {structureNames[structure.structure_number] ||
          t("programs.statisticsPage.structure", {
            number: structure.structure_number,
          })}
      </h2>

      <div className="program-stat__metrics program-stat__metrics--places">
        <div className="program-stat__metric">
          <span>{t("programs.statisticsPage.totalPartners")}</span>
          <strong>{formatter.format(structure.total_profiles)}</strong>
        </div>
        <div className="program-stat__metric program-stat__metric--active">
          <span>{t("programs.statisticsPage.activePartners")}</span>
          <strong>{formatter.format(structure.active_profiles)}</strong>
        </div>
      </div>

      <div className="program-stat__subsection">
        <h3>{t("programs.statisticsPage.overallReferrals")}</h3>
        <ReferralMetrics referrals={structure.referrals} />
      </div>
    </article>
  );

  return (
    <section className="program-stat">
      <h2>{t("programs.statisticsPage.title")}</h2>

      {referralStructure ? (
        <article className="program-stat__card program-stat__card--summary">
          <h2>
            {programName || t("programs.statisticsPage.referralStructure")}
          </h2>
          <div className="program-stat__metrics program-stat__metrics--places">
            <div className="program-stat__metric">
              <span>{t("programs.statisticsPage.totalRegistrations")}</span>
              <strong>
                {formatter.format(referralStructure.total_profiles)}
              </strong>
            </div>
            <div className="program-stat__metric program-stat__metric--active">
              <span>{t("programs.statisticsPage.activatedPartners")}</span>
              <strong>
                {formatter.format(referralStructure.active_profiles)}
              </strong>
            </div>
          </div>
          <div className="program-stat__subsection">
            <h3>{t("programs.statisticsPage.overallReferrals")}</h3>
            <ReferralMetrics referrals={statistics.referrals} />
          </div>
        </article>
      ) : (
        <div className="program-stat__status program-stat__status--empty">
          {t("programs.statisticsPage.noStructures")}
        </div>
      )}

      {showLevelStatistics && otherStructures.length > 0 && (
        <div className="program-stat__structures">
          {otherStructures.map(renderLevel)}
        </div>
      )}
    </section>
  );
}

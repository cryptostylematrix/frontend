
import { useContext } from "react";
import MatrixFilters from "../../components/marketing/matrixes/filters/MatrixFilters";
import MatrixBreadCrumbs from "../../components/marketing/matrixes/MatrixBreadCrumbs";
import MatrixTree from "../../components/marketing/matrixes/tree/MatrixTree";
import TaskQueueBlock from "../../components/marketing/matrixes/TaskQueueBlock";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { MarketingProvider } from "../../context/MarketingContext";
import { getProfilePrograms } from "../../services/contractsApi";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { appConfig } from "../../config";

export default function NeoMatrixes() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const { t } = useTranslation();
  const [programAllowed, setProgramAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgramAllowed(null);

    if (!currentProfile) return () => { cancelled = true; };

    const run = async () => {
      const program = await getProfilePrograms(currentProfile.address);
      if (cancelled) return;
      if (!program?.neo || program.neo.confirmed !== 1) {
        setProgramAllowed(false);
      } else {
        setProgramAllowed(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentProfile]);

  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  if (programAllowed === false) {
    return (
      <section className="neo-matrixes">
        <div className="profile-status-block wallet">
          <div className="status-text">
            <strong>{t("neoMatrix.filters.programNotConfirmed", "You need to choose an inviter first.")}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <MarketingProvider marketingAddr={appConfig.neo.marketingAddr}>
      <section className="neo-matrixes">
        <MatrixFilters />
        <TaskQueueBlock />
        <MatrixBreadCrumbs />
        <MatrixTree />
      </section>
    </MarketingProvider>
  );
}

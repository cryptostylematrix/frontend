
import { useContext } from "react";
import MultiMatrixFilters from "../../components/multi/matrixes/filters/MultiMatrixFilters";
import MultiMatrixBreadCrumbs from "../../components/multi/matrixes/MultiMatrixBreadCrumbs";
import MultiMatrixTree from "../../components/multi/matrixes/tree/MultiMatrixTree";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { MatrixProvider } from "../../context/MatrixContext";
import { getProfileProgramData } from "../../services/profileService";
import { Programs } from "../../contracts/MultiConstants";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function MultiMatrixes() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const { t } = useTranslation();
  const [programAllowed, setProgramAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgramAllowed(null);

    if (!currentProfile) return () => { cancelled = true; };

    const run = async () => {
      const program = await getProfileProgramData(currentProfile.address, Programs.multi);
      if (cancelled) return;
      if (!program.success || !program.data || !program.data.confirmed) {
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
      <section className="multi-matrixes">
        <div className="profile-status-block wallet">
          <div className="status-text">
            <strong>{t("multiMatrix.filters.programNotConfirmed", "You need to choose an inviter first.")}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <MatrixProvider>
      <section className="multi-matrixes">
        <MultiMatrixFilters />
        <MultiMatrixBreadCrumbs />
        <MultiMatrixTree />
      </section>
    </MatrixProvider>
  );
}

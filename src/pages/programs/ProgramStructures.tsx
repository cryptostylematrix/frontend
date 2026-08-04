import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../App";
import Filters from "../../components/programs/filters/Filters";
import PlaceBreadCrumbs from "../../components/programs/PlaceBreadCrumbs";
import TaskQueueBlock from "../../components/programs/TaskQueueBlock";
import Tree from "../../components/programs/tree/Tree";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { useProfileContext } from "../../context/ProfileContext";
import { useProgramContext } from "../../context/ProgramContext";
import { StructuresProvider } from "../../context/StructuresContext";
import { getInviteInfo } from "../../services/programApi";
import "./program-structures.css";

export default function ProgramStructures() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const { t } = useTranslation();
  const [programAllowed, setProgramAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgramAllowed(null);

    if (!currentProfile) {
      return () => {
        cancelled = true;
      };
    }

    const checkProgramAccess = async () => {
      const invite = await getInviteInfo(
        marketingAddress,
        currentProfile.address,
      );
      if (!cancelled) setProgramAllowed(Boolean(invite));
    };

    void checkProgramAccess();
    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress]);

  if (!wallet) return <ProfileStatusBlock type="wallet" />;
  if (!currentProfile) return <ProfileStatusBlock type="profile" />;
  if (programAllowed === null) return null;

  if (!programAllowed) {
    return (
      <section className="program-structures">
        <div className="profile-status-block wallet">
          <div className="status-text">
            <strong>
              {t(
                "structure.programNotConfirmed",
                "You need to choose an inviter first.",
              )}
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <StructuresProvider>
      <section className="program-structures">
        <Filters />
        <TaskQueueBlock />
        <PlaceBreadCrumbs />
        <Tree />
      </section>
    </StructuresProvider>
  );
}

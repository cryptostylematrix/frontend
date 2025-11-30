
import { useContext, useEffect, useState } from "react";
import "../profile/add-profile.css";
import "./multi-inviter.css";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { ErrorCode } from "../../errors/ErrorCodes";
import { translateError } from "../../errors/errorUtils";
import { getProfileProgramData } from "../../services/profileService";
import { Programs } from "../../contracts/MultiConstants";
import { type ProgramData } from "../../contracts/ProfileItemV1";
import MultiInviterInviterData from "../../components/multi/inviter/MultiInviterInviterData";
import MultiInviterChooseInviter from "../../components/multi/inviter/MultiInviterChooseInviter";

export default function MultiInviter() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [programErrors, setProgramErrors] = useState<ErrorCode[] | null>(null);
  const [isProgramLoading, setIsProgramLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProgramData(null);
    setProgramErrors(null);
    setIsProgramLoading(true);

    if (!currentProfile) return () => {
      cancelled = true;
    };

    const loadProgramStatus = async () => {
      const program = await getProfileProgramData(currentProfile.address, Programs.multi);
      if (cancelled) return;

      if (!program.success) {
        setProgramErrors(program.errors ?? [ErrorCode.UNEXPECTED]);
        setProgramData(null);
      } else {
        setProgramData(program.data ?? null);
      }
      setIsProgramLoading(false);
    };

    loadProgramStatus();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, reloadKey]);

  if (!wallet) return <ProfileStatusBlock type="wallet" />;
  if (!currentProfile) return <ProfileStatusBlock type="profile" />;

  const handleInviterChosen = () => setReloadKey((key) => key + 1);

  return (
    <section className="multi-inviter">
      <div className="add-profile-container">
        {programErrors && programErrors.length > 0 && (
          <div className="error-message">
            {programErrors.map((code) => (
              <div key={code}>{translateError(t, code)}</div>
            ))}
          </div>
        )}

        {isProgramLoading ? (
          <div className="inviter-loading">
            <span className="spinner" />
          </div>
        ) : programData?.confirmed ? (
          <MultiInviterInviterData
            inviterAddress={programData.inviter.toString({ urlSafe: true, bounceable: true, testOnly: false })}
          />
        ) : (
          <MultiInviterChooseInviter onInviterChosen={handleInviterChosen} />
        )}
      </div>
    </section>
  );
}

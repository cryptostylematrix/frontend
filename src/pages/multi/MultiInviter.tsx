
import { useContext, useEffect, useState } from "react";
import "../profile/add-profile.css";
import "./multi-inviter.css";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { ErrorCode } from "../../errors/ErrorCodes";
import { translateError } from "../../errors/errorUtils";
import { getProfilePrograms } from "../../services/contractsApi";
import MultiInviterInviterData from "../../components/multi/inviter/MultiInviterInviterData";
import MultiInviterChooseInviter from "../../components/multi/inviter/MultiInviterChooseInviter";

type ProgramInfo = {
  confirmed: boolean;
  inviter_addr: string;
  invite_addr: string;
  seq_no: number;
};

export default function MultiInviter() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();
  const [programData, setProgramData] = useState<ProgramInfo | null>(null);
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
      const program = await getProfilePrograms(currentProfile.address);
      if (cancelled) return;

      const multi = program?.multi;
      if (!multi || multi.confirmed !== 1) {
        setProgramErrors([ErrorCode.UNEXPECTED]);
        setProgramData(null);
      } else {
        setProgramData({
          confirmed: true,
          inviter_addr: multi.inviter_addr,
          invite_addr: multi.invite_addr,
          seq_no: multi.seq_no,
        });
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
          <MultiInviterInviterData inviterAddress={programData.inviter_addr} />
        ) : (
          <MultiInviterChooseInviter onInviterChosen={handleInviterChosen} />
        )}
      </div>
    </section>
  );
}

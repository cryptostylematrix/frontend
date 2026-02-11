import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { chooseInviter } from "../../../services/profileService";
import { getInviteAddrBySeqNo, getInviteData, getNftAddrByLogin, getProfilePrograms } from "../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useProfileContext } from "../../../context/ProfileContext";
import { getPlacesCount } from "../../../services/matrixApi";
import "./multi-inviter-choose-inviter.css";

type Props = {
  onInviterChosen: () => void;
};

export default function MultiInviterChooseInviter({ onInviterChosen }: Props) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const { currentProfile } = useProfileContext();
  const [inviterLogin, setInviterLogin] = useState("");
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const currentProfileAddress = currentProfile?.address ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCodes(null);
    setSuccessMsg(null);

    if (!currentProfileAddress) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    const trimmed = inviterLogin.trim();
    if (!trimmed) {
      setErrorCodes([ErrorCode.INVALID_LOGIN]);
      return;
    }

    setIsSubmitting(true);

    // get current program
    const currentProgram = await getProfilePrograms(currentProfileAddress);
    const currentMulti = currentProgram?.multi;
    // if inviter is already chosen
    if (currentMulti?.confirmed === 1) {
      setIsSubmitting(false);
      onInviterChosen();
      return;
    }

    // if loading inviter profile fails
    const inviterProfileResult = await getNftAddrByLogin(trimmed);
    if (!inviterProfileResult?.addr) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.INVALID_LOGIN]);
      return;
    }

    // get inviter's program data
    const programResult = await getProfilePrograms(inviterProfileResult.addr);
    if (!programResult) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    const inviterProgram = programResult.multi;
    // if inviter participated to the program
    if (!inviterProgram || inviterProgram.confirmed !== 1) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.INVITER_NOT_IN_PROGRAM]);
      return;
    }

    // if loading inviter data failed
    const inviterAddr = inviterProgram.invite_addr;
    const inviterData = await getInviteData(inviterAddr);
    if (!inviterData) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.UNEXPECTED]);
      return;
    }

    const inviterOwnerAddress = inviterData.owner?.owner_addr ?? "";
    if (!inviterOwnerAddress) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    const placesCount = await getPlacesCount(1, inviterOwnerAddress);
    if (placesCount === 0) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.INVITER_HAS_NO_PLACES]);
      return;
    }

    // if calculating invite's address fails
    const inviteAddrResult = await getInviteAddrBySeqNo(inviterAddr, inviterData.next_ref_no);
    if (!inviteAddrResult) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.UNEXPECTED]);
      return;
    }

    // choose inviter
    const chooseResult = await chooseInviter(tonConnectUI, currentProfileAddress, inviterAddr, inviterData.next_ref_no, inviteAddrResult.addr);

    setIsSubmitting(false);

    if (!chooseResult.success) {
      setErrorCodes(chooseResult.errors ?? [ErrorCode.UNEXPECTED]);
      return;
    }

    setErrorCodes(null);
    setSuccessMsg(t("multi.inviter.success", "Inviter chosen. Updates will appear soon, please refresh the page later."));
    onInviterChosen();
  };

  const isFormDisabled = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="fields">
      <label className="field">
        <span className="label-text">{t("multi.inviter.loginLabel", "Inviter login")}</span>
        <input
          type="text"
          maxLength={40}
          placeholder={t("multi.inviter.loginPlaceholder", "Enter inviter login")}
          value={inviterLogin}
          onChange={(e) => setInviterLogin(e.target.value)}
          required
          disabled={isFormDisabled}
        />
      </label>

      {errorCodes && errorCodes.length > 0 && (
        <div className="error-message">
          {errorCodes.map((code) => (
            <div key={code}>{translateError(t, code)}</div>
          ))}
        </div>
      )}
      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="actions">
        <button type="submit" className="btn submit" disabled={isFormDisabled}>
          {isSubmitting ? (
            <span className="spinner" />
          ) : (
            <>
              <Save className="btn-icon" /> {t("multi.inviter.submit", "Choose inviter")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

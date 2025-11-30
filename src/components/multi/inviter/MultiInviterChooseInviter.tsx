import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { chooseInviter, getProfileProgramData } from "../../../services/profileService";
import { getProfileAddressByLogin } from "../../../services/profileCollectionService";
import { Programs } from "../../../contracts/MultiConstants";
import { getInviteData, getInviteAddressBySeqNo } from "../../../services/inviteService";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useProfileContext } from "../../../context/ProfileContext";
import { getPlacesCount } from "../../../services/matrixService";
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

    // get current porgram
    const currentProgram = await getProfileProgramData(currentProfileAddress, Programs.multi);
    if (!currentProgram.success) {
      setIsSubmitting(false);
      setErrorCodes(currentProgram.errors ?? [ErrorCode.UNEXPECTED]);
      return;
    }

    // if inviter is already chosen
    if (currentProgram.data?.confirmed) {
      setIsSubmitting(false);
      onInviterChosen();
      return;
    }

    // if loading inviter profile fails
    const inviterProfileResult = await getProfileAddressByLogin(trimmed);
    if (!inviterProfileResult.success) {
      setIsSubmitting(false);
      setErrorCodes(inviterProfileResult.errors ?? [ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    // get inviter's program data
    const programResult = await getProfileProgramData(inviterProfileResult.address, Programs.multi);
    if (!programResult.success) {
      setIsSubmitting(false);
      setErrorCodes(programResult.errors ?? [ErrorCode.UNEXPECTED]);
      return;
    }

    // if inviter participated to the program
    if (!programResult.data || !programResult.data.confirmed) {
      setIsSubmitting(false);
      setErrorCodes([ErrorCode.INVITER_NOT_IN_PROGRAM]);
      return;
    }

    // if loading inviter data failed
    const inviterAddr = programResult.data.invite.toString({ urlSafe: true, bounceable: true, testOnly: false });
    const inviterData = await getInviteData(inviterAddr);
    if (!inviterData.success) {
      setIsSubmitting(false);
      setErrorCodes(inviterData.errors ?? [ErrorCode.UNEXPECTED]);
      return;
    }

    const inviterOwnerAddress = inviterData.data.owner?.owner?.toString({ urlSafe: true, bounceable: true, testOnly: false }) ?? "";
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
    const inviteAddrResult = await getInviteAddressBySeqNo(inviterAddr, inviterData.data.next_ref_no);
    if (!inviteAddrResult.success) {
      setIsSubmitting(false);
      setErrorCodes(inviteAddrResult.errors ?? [ErrorCode.UNEXPECTED]);
      return;
    }

    // choose inviter
    const chooseResult = await chooseInviter(
      tonConnectUI,
      currentProfileAddress,
      Programs.multi,
      inviterAddr,
      inviterData.data.next_ref_no,
      inviteAddrResult.address
    );

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

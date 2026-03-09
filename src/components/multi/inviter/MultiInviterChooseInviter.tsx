import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { chooseInviter } from "../../../services/profileService";
import { getInviteAddrBySeqNo, getInviteData, getNftAddrByLogin, getProfileNftData, getProfilePrograms } from "../../../services/contractsApi";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useProfileContext } from "../../../context/ProfileContext";
import { getPlacesCount } from "../../../services/matrixApi";
import { loadRootByLogin } from "../../../services/structureService";
import ConfirmDialog from "../../common/ConfirmDialog";
import "./multi-inviter-inviter-data.css";
import "./multi-inviter-choose-inviter.css";

type Props = {
  onInviterChosen: () => void;
};

export default function MultiInviterChooseInviter({ onInviterChosen }: Props) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const { currentProfile } = useProfileContext();
  const [popularCurator, setPopularCurator] = useState<{
    login: string;
    imageUrl: string;
    firstName?: string;
    lastName?: string;
    tgUsername?: string;
  } | null>(null);
  const [isPopularCuratorLoading, setIsPopularCuratorLoading] = useState(false);
  const [inviterLogin, setInviterLogin] = useState("");
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopularConfirm, setShowPopularConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const currentProfileAddress = currentProfile?.address ?? "";

  useEffect(() => {
    let cancelled = false;

    const loadPopularCurator = async () => {
      setIsPopularCuratorLoading(true);
      setPopularCurator(null);

      const rootResult = await loadRootByLogin("admin");
      if (!rootResult.success || !rootResult.node) {
        if (!cancelled) setIsPopularCuratorLoading(false);
        return;
      }

      const adminNftAddr = await getNftAddrByLogin("admin");
      const adminNft = adminNftAddr?.addr ? await getProfileNftData(adminNftAddr.addr) : null;

      if (cancelled) return;

      setPopularCurator({
        login: rootResult.node.login,
        imageUrl: adminNft?.content?.image_url ?? "",
        firstName: rootResult.node.firstName ?? undefined,
        lastName: rootResult.node.lastName ?? undefined,
        tgUsername: rootResult.node.tgUsername ?? undefined,
      });
      setIsPopularCuratorLoading(false);
    };

    loadPopularCurator();

    return () => {
      cancelled = true;
    };
  }, []);

  const chooseInviterByLogin = async (login: string) => {
    setErrorCodes(null);
    setSuccessMsg(null);

    if (!currentProfileAddress) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    const trimmed = login.trim();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await chooseInviterByLogin(inviterLogin);
  };

  const handleChoosePopularCurator = async () => {
    if (!popularCurator?.login || isSubmitting) return;
    setShowPopularConfirm(true);
  };

  const isFormDisabled = isSubmitting;
  const cleanedTgUsername = popularCurator?.tgUsername?.replace(/^@+/, "");

  return (
    <div className="multi-inviter-choose-wrap">
      {isPopularCuratorLoading ? (
        <div className="inviter-loading">
          <span className="spinner" />
        </div>
      ) : popularCurator ? (
        <div className="inviter-info popular-curator-card">
          <img src={popularCurator.imageUrl} alt={popularCurator.login} className="inviter-avatar" />
          <div className="inviter-text">
            <div className="inviter-login">{popularCurator.login}</div>
            {(popularCurator.firstName || popularCurator.lastName) && (
              <div className="inviter-name">{[popularCurator.firstName, popularCurator.lastName].filter(Boolean).join(" ")}</div>
            )}
            {cleanedTgUsername && (
              <a
                className="inviter-tg"
                href={`https://t.me/${cleanedTgUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                @{cleanedTgUsername}
              </a>
            )}
            <div className="popular-curator-description">
              {t("multi.inviter.systemPlaceDescription", "Registration under a system place for independent team building")}
            </div>
            <button
              type="button"
              className="btn submit popular-curator-action"
              onClick={handleChoosePopularCurator}
              disabled={isFormDisabled}
            >
              <Save className="btn-icon" /> {t("multi.inviter.submit", "Choose inviter")}
            </button>
          </div>
        </div>
      ) : null}

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

      <ConfirmDialog
        open={showPopularConfirm}
        title={t("multi.inviter.confirmChooseTitle", "Confirm inviter selection")}
        message={t("multi.inviter.confirmChoosePopular", "Are you sure you want to choose this inviter?")}
        confirmLabel={t("multi.inviter.submit", "Choose inviter")}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setShowPopularConfirm(false)}
        onConfirm={() => {
          setShowPopularConfirm(false);
          if (popularCurator?.login) {
            chooseInviterByLogin(popularCurator.login);
          }
        }}
      />
    </div>
  );
}

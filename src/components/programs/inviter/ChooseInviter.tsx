import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Address, beginCell, Cell } from "@ton/core";
import { Save } from "lucide-react";
import { UserCommandTag } from "../../../contracts/schemes/UserCommand";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import {
  buildMarketingV3ExecMessageBody,
  getMarketingV3Data,
  getProfileNftData,
} from "../../../services/contractsApi";
import { getRootInviteInfo } from "../../../services/programApi";
import { loadRootByLogin } from "../../../services/referralsService";
import { sendTransaction } from "../../../services/tonConnectService";
import ConfirmDialog from "../../common/ConfirmDialog";
import "./inviter-data.css";
import "./choose-inviter.css";

type Props = {
  onInviterChosen: () => void;
};

export default function ChooseInviter({ onInviterChosen }: Props) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const [inviterLogin, setInviterLogin] = useState("");
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopularInviterLoading, setIsPopularInviterLoading] = useState(false);
  const [pendingInviter, setPendingInviter] = useState<{
    profileAddress: string;
    login: string;
  } | null>(null);
  const [popularInviter, setPopularInviter] = useState<{
    profileAddress: string;
    login: string;
    imageUrl: string;
    firstName?: string;
    lastName?: string;
    tgUsername?: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErrorCodes(null);
    setSuccessMessage(null);
    setPopularInviter(null);
    setIsPopularInviterLoading(true);

    const loadPopularCurator = async () => {
      try {
        const rootInvite = await getRootInviteInfo(marketingAddress);
        if (!rootInvite) return;

        const profileData = await getProfileNftData(rootInvite.profile_addr);
        const content = profileData?.content;
        if (cancelled) return;

        setPopularInviter({
          profileAddress: rootInvite.profile_addr,
          login: content?.login || rootInvite.profile_login,
          imageUrl: content?.image_url || "",
          firstName: content?.first_name || undefined,
          lastName: content?.last_name || undefined,
          tgUsername: content?.tg_username || undefined,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load popular program inviter", error);
        }
      } finally {
        if (!cancelled) setIsPopularInviterLoading(false);
      }
    };

    void loadPopularCurator();

    return () => {
      cancelled = true;
    };
  }, [marketingAddress]);

  const chooseInviterByProfileAddress = async (inviterProfileAddress: string) => {
    setErrorCodes(null);
    setSuccessMessage(null);

    const profileAddress = currentProfile?.address?.trim();
    if (!profileAddress) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    setIsSubmitting(true);

    try {
      const marketingData = await getMarketingV3Data(marketingAddress);
      const gramFee = marketingData?.structures["0"]
        ?.commands[String(UserCommandTag.chooseInviter)]?.gram_fee;

      if (gramFee === undefined) {
        setErrorCodes([ErrorCode.INVALID_PAYLOAD]);
        return;
      }

      const payload = beginCell()
        .storeAddress(Address.parse(inviterProfileAddress))
        .endCell();
      const bodyResponse = await buildMarketingV3ExecMessageBody({
        queryId: createQueryId(),
        structure: 0,
        profileAddr: profileAddress,
        commandTag: UserCommandTag.chooseInviter,
        payloadBocHex: payload.toBoc().toString("hex"),
      });
      if (!bodyResponse?.boc_hex) {
        setErrorCodes([ErrorCode.INVALID_PAYLOAD]);
        return;
      }

      const body = Cell.fromHex(bodyResponse.boc_hex);
      const result = await sendTransaction(
        tonConnectUI,
        marketingAddress,
        BigInt(gramFee),
        body,
      );

      if (!result.success) {
        setErrorCodes(result.errors ?? [ErrorCode.TRANSACTION_FAILED]);
        return;
      }
    } catch (error) {
      console.error("Failed to choose program inviter", error);
      setErrorCodes([ErrorCode.TRANSACTION_FAILED]);
      return;
    } finally {
      setIsSubmitting(false);
    }

    setSuccessMessage(
      t(
        "inviter.success",
        "Inviter chosen. Updates will appear soon, please refresh the page later.",
      ),
    );
    onInviterChosen();
  };

  const chooseInviterByLogin = async (login: string) => {
    const normalizedLogin = login.trim();
    if (!normalizedLogin) {
      setErrorCodes([ErrorCode.INVALID_LOGIN]);
      return;
    }

    setIsSubmitting(true);
    const inviter = await loadRootByLogin(normalizedLogin, marketingAddress);
    if (!inviter.success || !inviter.node) {
      setErrorCodes([ErrorCode.INVITER_NOT_IN_PROGRAM]);
      setIsSubmitting(false);
      return;
    }

    setPendingInviter({
      profileAddress: inviter.node.addr,
      login: inviter.node.login,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await chooseInviterByLogin(inviterLogin);
  };

  const cleanedTgUsername = popularInviter?.tgUsername?.replace(/^@+/, "");

  return (
    <div className="choose-inviter-wrap">
      <form onSubmit={handleSubmit} className="fields">
        <label className="field">
          <span className="label-text">
            {t("inviter.loginLabel", "Inviter login")}
          </span>
          <input
            type="text"
            maxLength={40}
            placeholder={t("inviter.loginPlaceholder", "Enter inviter login")}
            value={inviterLogin}
            onChange={(event) => setInviterLogin(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>

        {errorCodes && errorCodes.length > 0 && (
          <div className="error-message">
            {errorCodes.map((code) => (
              <div key={code}>{translateError(t, code)}</div>
            ))}
          </div>
        )}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <div className="actions">
          <button type="submit" className="btn submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="spinner" />
            ) : (
              <>
                <Save className="btn-icon" /> {t("inviter.submit", "Choose inviter")}
              </>
            )}
          </button>
        </div>
      </form>

      {isPopularInviterLoading ? (
        <div className="inviter-loading">
          <span className="spinner" />
        </div>
      ) : popularInviter ? (
        <div className="inviter-info popular-curator-card">
          <img
            src={popularInviter.imageUrl}
            alt={popularInviter.login}
            className="inviter-avatar"
          />
          <div className="inviter-text">
            <div className="inviter-login">{popularInviter.login}</div>
            {(popularInviter.firstName || popularInviter.lastName) && (
              <div className="inviter-name">
                {[popularInviter.firstName, popularInviter.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </div>
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
              {t(
                "inviter.systemPlaceDescription",
                "Registration under a system place for independent team building",
              )}
            </div>
            <button
              type="button"
              className="btn submit popular-curator-action"
              onClick={() =>
                setPendingInviter({
                  profileAddress: popularInviter.profileAddress,
                  login: popularInviter.login,
                })
              }
              disabled={isSubmitting}
            >
              <Save className="btn-icon" /> {t("inviter.submit", "Choose inviter")}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingInviter !== null}
        title={t("inviter.confirmChooseTitle", "Confirm inviter selection")}
        message={
          <>
            <p>
              {t(
                "inviter.confirmChoosePopular",
                "Are you sure you want to choose this inviter?",
              )}
            </p>
            {pendingInviter && (
              <p>
                {t("inviter.loginLabel", "Inviter login")}: {" "}
                <strong>{pendingInviter.login}</strong>
              </p>
            )}
            {currentProfile?.mode === "preview" && (
              <p className="confirm-modal__warning">
                {t("structure.previewCommandWarning", {
                  login: currentProfile.login,
                  defaultValue:
                    "Attention: this profile belongs to another wallet. This command will be executed for the foreign profile {{login}}.",
                })}
              </p>
            )}
          </>
        }
        confirmLabel={t("inviter.submit", "Choose inviter")}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => setPendingInviter(null)}
        onConfirm={() => {
          const inviter = pendingInviter;
          setPendingInviter(null);
          if (inviter) {
            void chooseInviterByProfileAddress(inviter.profileAddress);
          }
        }}
      />
    </div>
  );
}

function createQueryId(): bigint {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return (BigInt(Date.now()) << 20n) | BigInt(random[0] & 0xfffff);
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { getProfileNftData } from "../../../services/contractsApi";
import "./inviter-data.css";

type Props = {
  inviterProfileAddress: string;
};

type InviterProfile = {
  address: string;
  login: string;
  imageUrl: string;
  firstName?: string;
  lastName?: string;
  tgUsername?: string;
};

export default function InviterData({ inviterProfileAddress }: Props) {
  const { t } = useTranslation();
  const [inviterProfile, setInviterProfile] = useState<InviterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInviterProfile(null);
    setErrorCode(null);
    setIsLoading(true);

    const loadInviter = async () => {
      try {
        const address = inviterProfileAddress.trim();
        const profileData = await getProfileNftData(address);
        const content = profileData?.content;

        if (cancelled) return;
        if (!content) {
          setErrorCode(ErrorCode.PROFILE_NOT_FOUND);
        } else {
          setInviterProfile({
            address,
            login: content.login,
            imageUrl: content.image_url || "",
            firstName: content.first_name || undefined,
            lastName: content.last_name || undefined,
            tgUsername: content.tg_username || undefined,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load inviter profile", error);
        setErrorCode(ErrorCode.PROFILE_NOT_FOUND);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (!inviterProfileAddress.trim()) {
      setErrorCode(ErrorCode.INVALID_WALLET_ADDRESS);
      setIsLoading(false);
    } else {
      loadInviter();
    }

    return () => {
      cancelled = true;
    };
  }, [inviterProfileAddress]);

  if (isLoading) {
    return (
      <div className="inviter-loading">
        <span className="spinner" />
      </div>
    );
  }

  if (inviterProfile) {
    const telegramUsername = inviterProfile.tgUsername?.replace(/^@+/, "");

    return (
      <div className="inviter-info">
        <img
          src={inviterProfile.imageUrl}
          alt={inviterProfile.login}
          className="inviter-avatar"
        />
        <div className="inviter-text">
          <div className="inviter-login">{inviterProfile.login}</div>
          {(inviterProfile.firstName || inviterProfile.lastName) && (
            <div className="inviter-name">
              {[inviterProfile.firstName, inviterProfile.lastName]
                .filter(Boolean)
                .join(" ")}
            </div>
          )}
          {telegramUsername && (
            <a
              className="inviter-tg"
              href={`https://t.me/${telegramUsername}`}
              target="_blank"
              rel="noreferrer"
            >
              @{telegramUsername}
            </a>
          )}
        </div>
      </div>
    );
  }

  return errorCode ? (
    <div className="error-message">{translateError(t, errorCode)}</div>
  ) : null;
}

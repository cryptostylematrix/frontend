import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { getInviteData } from "../../../services/inviteService";
import { getNftData, type NftProfileData } from "../../../services/profileService";
import "./multi-inviter-inviter-data.css";

type Props = {
  inviterAddress: string;
};

export default function MultiInviterInviterData({ inviterAddress }: Props) {
  const { t } = useTranslation();
  const [inviterProfile, setInviterProfile] = useState<NftProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInviterProfile(null);
    setErrorCodes(null);
    setIsLoading(true);

    const loadInviter = async () => {
      if (!inviterAddress?.trim()) {
        setErrorCodes([ErrorCode.INVALID_WALLET_ADDRESS]);
        setIsLoading(false);
        return;
      }

      if (cancelled) return;

      // get getting invite data fails
      const inviteData = await getInviteData(inviterAddress);
      if (!inviteData.success) {
        setErrorCodes(inviteData.errors ?? [ErrorCode.UNEXPECTED]);
        setIsLoading(false);
        return;
      }

      // if owner is not set
      const ownerAddress = inviteData.data.owner?.owner;
      if (!ownerAddress) {
        setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
        setIsLoading(false);
        return;
      }

      // get nft data
      const profileAddr = ownerAddress.toString({ urlSafe: true, bounceable: true, testOnly: false });
      const inviterNft = await getNftData(profileAddr);

      if (cancelled) return;

      if (!inviterNft.success) {
        setErrorCodes(inviterNft.errors ?? [ErrorCode.UNEXPECTED]);
      } else {
        setInviterProfile(inviterNft.data);
      }
      setIsLoading(false);
    };

    loadInviter();

    return () => {
      cancelled = true;
    };
  }, [inviterAddress]);

  if (isLoading) {
    return (
      <div className="inviter-loading">
        <span className="spinner" />
      </div>
    );
  }

  const cleanedTgUsername = inviterProfile?.tgUsername?.replace(/^@+/, "");

  if (inviterProfile) {
    return (
      <div className="inviter-info">
        <img src={inviterProfile.imageUrl} alt={inviterProfile.login} className="inviter-avatar" />
        <div className="inviter-text">
          <div className="inviter-login">{inviterProfile.login}</div>
          {(inviterProfile.firstName || inviterProfile.lastName) && (
            <div className="inviter-name">
              {[inviterProfile.firstName, inviterProfile.lastName].filter(Boolean).join(" ")}
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
        </div>
      </div>
    );
  }

  if (errorCodes && errorCodes.length > 0) {
    return (
      <div className="error-message">
        {errorCodes.map((code) => (
          <div key={code}>{translateError(t, code)}</div>
        ))}
      </div>
    );
  }

  return null;
}

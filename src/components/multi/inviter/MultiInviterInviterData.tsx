import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorCode } from "../../../errors/ErrorCodes";
import { translateError } from "../../../errors/errorUtils";
import { getInviteData } from "../../../services/contractsApi";
import { getProfileNftData } from "../../../services/contractsApi";
import "./multi-inviter-inviter-data.css";

type Props = {
  inviterAddress: string;
};

export default function MultiInviterInviterData({ inviterAddress }: Props) {
  const { t } = useTranslation();
  const [inviterProfile, setInviterProfile] = useState<{
    address: string;
    login: string;
    imageUrl: string;
    firstName?: string;
    lastName?: string;
    tgUsername?: string;
  } | null>(null);
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
      if (!inviteData) {
        setErrorCodes([ErrorCode.UNEXPECTED]);
        setIsLoading(false);
        return;
      }

      // if owner is not set
      const ownerAddress = inviteData.owner?.owner_addr;
      if (!ownerAddress) {
        setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
        setIsLoading(false);
        return;
      }

      // get nft data
      const inviterNft = await getProfileNftData(ownerAddress);

      if (cancelled) return;

      if (!inviterNft?.content?.login) {
        setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      } else {
        setInviterProfile({
          address: ownerAddress,
          login: inviterNft.content.login,
          imageUrl: inviterNft.content.image_url ?? "",
          firstName: inviterNft.content.first_name ?? undefined,
          lastName: inviterNft.content.last_name ?? undefined,
          tgUsername: inviterNft.content.tg_username ?? undefined,
        });
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

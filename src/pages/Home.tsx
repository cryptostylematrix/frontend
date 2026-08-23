import "./home.css";
import no_avatar from "../assets/no-avatar.jpg";
import {
  AtSign,
  Check,
  Copy,
  ExternalLink,
  Send,
  User,
  Wallet,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import ProfileStatusBlock from "../components/ProfileStatusBlock";
import AvailablePrograms from "../components/AvailablePrograms";
import AvailableTestPrograms from "../components/AvailableTestPrograms";
import { WalletContext } from "../App";
import { useProfileContext } from "../context/ProfileContext";
import { getContractBalance } from "../services/contractsApi";
import { useTranslation } from "react-i18next";
import { translateError } from "../errors/errorUtils";
import { ErrorCode } from "../errors/ErrorCodes";
import { copyText } from "../utils/clipboard";

export default function Home() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<ErrorCode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileAddressCopied, setProfileAddressCopied] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    const loadBalance = async () => {
      setLoading(true);
      setError(null);
      setBalance(null);

      const result = await getContractBalance(wallet);
      if (result) {
        setBalance(result.balance.toString());
      } else {
        setError([ErrorCode.BALANCE_FETCH_FAILED]);
      }

      setLoading(false);
    };

    loadBalance();
  }, [wallet]);

  useEffect(() => {
    setProfileAddressCopied(false);
  }, [currentProfile?.address]);

  useEffect(() => {
    if (!profileAddressCopied) return;
    const timer = window.setTimeout(
      () => setProfileAddressCopied(false),
      1_800,
    );
    return () => window.clearTimeout(timer);
  }, [profileAddressCopied]);

  const handleCopyProfileAddress = async () => {
    const address = currentProfile?.address?.trim();
    if (!address) return;

    try {
      await copyText(address);
      setProfileAddressCopied(true);
    } catch (copyError) {
      console.error("Failed to copy profile address", copyError);
    }
  };

  // 🧩 No wallet connected
  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  // 🧩 Wallet connected but no active profile
  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  // 🧠 Main content
  return (
    <>
      {/* Profile Info */}
      <div className="profile-info">
        <div className="profile-image">
          <img
            src={currentProfile.imageUrl || no_avatar}
            alt={t("home.avatar_alt")}
          />
        </div>

        <div className="profile-details">
          <div className="profile-row">
            <User className="icon" />
            <span>
              {currentProfile.firstName} {currentProfile.lastName}
            </span>
          </div>
          <div className="profile-row">
            <Send className="icon" />
            <span>{currentProfile.tgUsername}</span>
          </div>
          <div className="profile-row">
            <AtSign className="icon" />
            <span className="profile-selected-login">
              {currentProfile.login}
            </span>
            <div className="profile-address-actions">
              <button
                type="button"
                className={`profile-address-action ${
                  profileAddressCopied ? "is-copied" : ""
                }`}
                onClick={() => void handleCopyProfileAddress()}
                aria-label={
                  profileAddressCopied
                    ? t("wallet.addressCopied", "Address copied")
                    : t("wallet.copyAddress", "Copy address")
                }
                title={
                  profileAddressCopied
                    ? t("wallet.addressCopied", "Address copied")
                    : t("wallet.copyAddress", "Copy address")
                }
              >
                {profileAddressCopied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
              </button>
              <a
                className="profile-address-action"
                href={`https://tonviewer.com/${encodeURIComponent(
                  currentProfile.address,
                )}`}
                target="_blank"
                rel="noreferrer"
                aria-label={t(
                  "programs.contractExplorer",
                  "Open contract in explorer",
                )}
                title={t(
                  "programs.contractExplorer",
                  "Open contract in explorer",
                )}
              >
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Block */}
      <div className="balance-card">
        <div className="balance-row">
          <Wallet className="icon" />
          {loading ? (
            <span>{t("home.loading")}</span>
          ) : error ? (
            <span className="balance-error">
              ⚠️ {translateError(t, error[0] ?? ErrorCode.BALANCE_FETCH_FAILED)}
            </span>
          ) : (
            <span>
              {balance ? `${balance} ${t("home.balance_unit")}` : "--"}
            </span>
          )}
        </div>
      </div>

      <AvailablePrograms />
      <AvailableTestPrograms />
    </>
  );
}

import "./home.css";
import no_avatar from "../assets/no-avatar.jpg";
import WarningBlock from "../components/WarningBlock";
import { User, Send, Wallet } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import ProfileStatusBlock from "../components/ProfileStatusBlock";
import { WalletContext } from "../App";
import { useProfileContext } from "../context/ProfileContext";
import { getBalance } from "../services/profileService";
import { useTranslation } from "react-i18next";
import { translateError } from "../errors/errorUtils";
import { ErrorCode } from "../errors/ErrorCodes";
import { fromNano } from "@ton/core";

export default function Home() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<ErrorCode[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    const loadBalance = async () => {
      setLoading(true);
      setError(null);
      setBalance(null);

      const result = await getBalance(wallet);
      if (result.success) {
        setBalance(fromNano(result.balance));
      } else {
        setError(result.errors);
      }

      setLoading(false);
    };

    loadBalance();
  }, [wallet]);

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

      {/* Optional warnings */}
      <WarningBlock />
    </>
  );
}

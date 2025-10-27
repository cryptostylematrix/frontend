import "./profile-status-block.css";
import { Wallet, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProfileStatusBlockProps {
  type: "wallet" | "profile";
}

export default function ProfileStatusBlock({ type }: ProfileStatusBlockProps) {
  const { t } = useTranslation();
  const isWallet = type === "wallet";

  return (
    <div className={`profile-status-block ${isWallet ? "wallet" : "profile"}`}>
      <div className="status-icon">
        {isWallet ? (
          <Wallet size={22} strokeWidth={1.8} />
        ) : (
          <UserX size={22} strokeWidth={1.8} />
        )}
      </div>

      <div className="status-text">
        <strong>
          {isWallet
            ? t("profile.status.wallet_title")
            : t("profile.status.profile_title")}
        </strong>
        <p>
          {isWallet
            ? t("profile.status.wallet_description")
            : t("profile.status.profile_description")}
        </p>
      </div>
    </div>
  );
}

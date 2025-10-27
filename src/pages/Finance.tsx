import "./finance.css";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import WarningBlock from "../components/WarningBlock";
import { WalletContext } from "../App";
import { useProfileContext } from "../context/ProfileContext";
import ProfileStatusBlock from "../components/ProfileStatusBlock";

export default function Finance() {
  console.log("rendering Finance");

  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  const title = <h1>{t("finance.title")}</h1>;

  // 🪙 Require wallet connection
  if (!wallet) {
    return (
      <>
        {title}
        <ProfileStatusBlock type="wallet" />
      </>
    );
  }

  // 👤 Require active profile
  if (!currentProfile) {
    return (
      <>
        {title}
        <ProfileStatusBlock type="profile" />
      </>
    );
  }

  // ✅ Main content (wallet + profile both available)
  return (
    <>
        {title}
        <WarningBlock />
    </>
  );
}
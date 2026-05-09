import "../profile/add-profile.css";
import WarningBlock from "../../components/WarningBlock";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { useContext } from "react";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";

export default function NeoStat() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  return (
    <section className="neo-stat">
      <WarningBlock />
    </section>
  );
}

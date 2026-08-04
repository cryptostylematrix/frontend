import { useContext } from "react";
import { WalletContext } from "../../App";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import WarningBlock from "../../components/WarningBlock";
import { useProfileContext } from "../../context/ProfileContext";
import "../profile/add-profile.css";
import "./program-stat.css";

export default function ProgramStat() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  return (
    <section className="program-stat">
      <WarningBlock />
    </section>
  );
}

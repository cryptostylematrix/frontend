import "./multi.css";
import { useTranslation } from "react-i18next";
import WarningBlock from "../components/WarningBlock";
import { useContext } from "react";
import { useProfileContext } from "../context/ProfileContext";
import { WalletContext } from "../App";
import ProfileStatusBlock from "../components/ProfileStatusBlock";
import { NavLink, Outlet } from "react-router-dom";

export default function Multi() {
  console.log("rendering Multi");

  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  const Submenu = () => (
    <nav className="multi-submenu">
      <ul>
        <li>
          <NavLink
            to="/multi/inviter"
            className={({ isActive }) => (isActive ? "active" : "")}
            end
          >
            {t("multi.inviter_link")}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/multi/structure"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {t("multi.structure_link")}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/multi/matrixes"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {t("multi.matrixes_link")}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/multi/marketing"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {t("multi.marketing_link")}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/multi/stat"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {t("multi.stat_link")}
          </NavLink>
        </li>
      </ul>
    </nav>
  );

  // 🪙 Require wallet connection
  if (!wallet) {
    return (
      <>
        <h1>{t("multi.title")}</h1>
        <Submenu />
        <ProfileStatusBlock type="wallet" />
      </>
    );
  }

  // 👤 Require active profile
  if (!currentProfile) {
    return (
      <>
        <h1>{t("multi.title")}</h1>
        <Submenu />
        <ProfileStatusBlock type="profile" />
      </>
    );
  }

  // ✅ Main section
  return (
    <>
      <h1>{t("multi.title")}</h1>
      <Submenu />

      <div className="multi-page">
        <WarningBlock />
        <Outlet />
      </div>
    </>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./profile/profile.css";
import "./administration.css";

export default function Administration() {
  const { t } = useTranslation();
  return <section className="administration-layout">
    <h1 className="page-title">{t("administration.title")}</h1>
    <nav className="profile-submenu" aria-label={t("administration.title")}>
      <ul>
        <li><NavLink to="/administration/test-programs">{t("administration.testProgramsLink")}</NavLink></li>
        <li><NavLink to="/administration/usage">{t("administration.statisticsLink")}</NavLink></li>
      </ul>
    </nav>
    <div className="administration-content"><Outlet /></div>
  </section>;
}

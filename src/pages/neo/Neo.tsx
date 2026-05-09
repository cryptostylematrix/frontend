import "./neo.css";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

export default function Neo() {

  const { t } = useTranslation();

  return (
    <section className="neo-layout">
      <h1 className="page-title">{t("neo.title")}</h1>

      {/* Neo subpage content */}
      <nav className="neo-submenu"  aria-label={t("neo.submenu_label")}>
        <ul>
          <li hidden>
            <NavLink
              to="/neo/inviter"
              className={({ isActive }) => (isActive ? "active" : "")}
              end>
                {t("neo.inviter_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/neo/structure"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("neo.structure_link")}
              </NavLink>
          </li>
          <li hidden>
            <NavLink
              to="/neo/matrixes"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("neo.matrixes_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/neo/marketing"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("neo.marketing_link")}
              </NavLink>
          </li>
          <li hidden>
            <NavLink
              to="/neo/stat"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("neo.stat_link")}
              </NavLink>
          </li>
        </ul>
      </nav>

      {/* Neo subpage content */}
      <div className="neo-page">
        <Outlet />
      </div>
    </section>
  );
}

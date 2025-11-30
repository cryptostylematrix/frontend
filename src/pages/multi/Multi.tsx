import "./multi.css";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

export default function Multi() {

  const { t } = useTranslation();

  return (
    <section className="multi-layout">
      <h1 className="page-title">{t("multi.title")}</h1>

      {/* Multi subpage content */}
      <nav className="multi-submenu"  aria-label={t("multi.submenu_label")}>
        <ul>
          <li>
            <NavLink
              to="/multi/inviter"
              className={({ isActive }) => (isActive ? "active" : "")}
              end>
                {t("multi.inviter_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/multi/structure"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("multi.structure_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/multi/matrixes"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("multi.matrixes_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/multi/marketing"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("multi.marketing_link")}
              </NavLink>
          </li>
          <li>
            <NavLink
              to="/multi/stat"
              className={({ isActive }) => (isActive ? "active" : "")}>
                {t("multi.stat_link")}
              </NavLink>
          </li>
        </ul>
      </nav>

      {/* Multi subpage content */}
      <div className="multi-page">
        <Outlet />
      </div>
    </section>
  );
}

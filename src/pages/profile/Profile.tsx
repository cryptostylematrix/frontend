import "./profile.css";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { t } = useTranslation();

  return (
    <section className="profile-layout">
      <h1 className="page-title">{t("profile.title")}</h1>

      {/* Profile submenu navigation */}
      <nav className="profile-submenu" aria-label={t("profile.submenu_label")}>
        <ul>
          <li>
            <NavLink
              to="/profile/update"
              className={({ isActive }) => (isActive ? "active" : "")}
              end
            >
              {t("profile.update_link")}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/profile/add"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {t("profile.add_link")}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/profile/create"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {t("profile.create_link")}
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Profile subpage content */}
      <div className="profile-page">
        <Outlet />
      </div>
    </section>
  );
}

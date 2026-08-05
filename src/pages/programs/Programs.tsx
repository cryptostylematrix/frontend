import { NavLink, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProgramProvider } from "../../context/ProgramContext";
import "./programs.css";

const pages = [
  { path: "inviter", labelKey: "inviter" },
  { path: "referrals", labelKey: "referrals" },
  { path: "structures", labelKey: "structures" },
  { path: "marketing", labelKey: "marketing" },
  { path: "stat", labelKey: "statistics" },
] as const;

export default function Programs() {
  const { t } = useTranslation();
  const { marketingAddress = "" } = useParams();

  return (
    <ProgramProvider marketingAddress={marketingAddress}>
      <section className="programs-layout">
        <nav
          className="programs-submenu"
          aria-label={t("programs.navigation", "Program navigation")}
        >
          <ul>
            {pages.map((page) => (
              <li key={page.path}>
                <NavLink
                  to={page.path}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {t(`programs.${page.labelKey}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="programs-page">
          <Outlet />
        </div>
      </section>
    </ProgramProvider>
  );
}

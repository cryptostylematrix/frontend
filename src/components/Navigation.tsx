import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Home, User, Wallet, Layers } from "lucide-react";
import "./navigation.css";

export default function Navigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const [compact, setCompact] = useState(window.innerWidth <= 700);

  // Switch to compact mode when viewport ≤ 700px
  useEffect(() => {
    const handleResize = () => setCompact(window.innerWidth <= 700);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const links = [
    { to: "/", icon: <Home size={22} strokeWidth={1.8} />, label: t("nav.home_page") },
    { to: "/profile", icon: <User size={22} strokeWidth={1.8} />, label: t("nav.profile_page") },
    { to: "/finance", icon: <Wallet size={22} strokeWidth={1.8} />, label: t("nav.finance_page") },
    { to: "/multi", icon: <Layers size={22} strokeWidth={1.8} />, label: t("nav.multi_page") },
  ];

  return (
    <nav className="navbar" aria-label={t("nav.main_navigation")}>
      <div className="nav-links">
        {links.map(({ to, icon, label }) => {
          const isActive =
            location.pathname === to || location.pathname.startsWith(`${to}/`);

          return (
            <Link
              key={to}
              to={to}
              className={isActive ? "active" : ""}
              aria-current={isActive ? "page" : undefined}>
                {icon}
                {!compact && <span className="link-text">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

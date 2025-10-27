// src/components/profiles/Profiles.tsx
import React, { useRef, useState, useEffect } from "react";
import "./profiles.css";
import { useNavigate } from "react-router-dom";
import { useProfileContext } from "../../context/ProfileContext";
import { useTranslation } from "react-i18next";

const Profiles: React.FC = () => {
  const { t } = useTranslation();
  const { profiles, currentProfile, isChecking, setCurrentProfile } = useProfileContext();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 🌀 Loading
  if (isChecking)
    return (
      <div className="profile-block">
        <div className="profile-loader">{t("profile.checking")}</div>
      </div>
    );

  // ➕ No profiles yet
  if (profiles.length === 0)
    return (
      <div className="profile-block">
        <button
          className="profile-add-btn"
          onClick={() => {
            setIsOpen(false);
            navigate("/profile/add");
          }}
        >
          {t("profile.add")}
        </button>
      </div>
    );

  // ✅ Dropdown of profiles
  return (
    <div className={`profile-block ${isOpen ? "active" : ""}`} ref={ref}>
      <button className="profile-btn" onClick={() => setIsOpen((prev) => !prev)}>
        {currentProfile?.login || t("profile.select")}
        <span className="profile-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <ul className="profile-dropdown">
          {profiles.map((p) => (
            <li key={p.login}>
              {p.valid ? (
                <button
                  onClick={() => {
                    setCurrentProfile(p);
                    setIsOpen(false);
                  }}
                  className={currentProfile?.login === p.login ? "active-profile" : ""}
                >
                  {p.login}
                </button>
              ) : (
                <button className="invalid-profile" disabled>
                  {p.login} ⚠️
                </button>
              )}
            </li>
          ))}

          <li className="divider"></li>
          <li>
            <button
              type="button"
              className="add-btn"
              onClick={() => {
                setIsOpen(false);
                navigate("/profile/add");
              }}
            >
              {t("profile.add")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default Profiles;

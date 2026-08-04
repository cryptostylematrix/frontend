import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReferralsTree from "../../components/programs/referrals/ReferralsTree";
import { useProfileContext } from "../../context/ProfileContext";
import { useProgramContext } from "../../context/ProgramContext";
import "./program-referrals.css";

export default function ProgramReferrals() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const [searchLogin, setSearchLogin] = useState(currentProfile?.login ?? "");
  const [rootLogin, setRootLogin] = useState(currentProfile?.login ?? "");

  useEffect(() => {
    const login = currentProfile?.login ?? "";
    setSearchLogin(login);
    setRootLogin(login);
  }, [currentProfile]);

  const handleSearch = () => {
    const trimmed = searchLogin.trim();
    if (trimmed) setRootLogin(trimmed);
  };

  const handleCuratorSelect = (login: string) => {
    setSearchLogin(login);
    setRootLogin(login);
  };

  return (
    <section className="program-referrals">
      <div className="structure-card">
        <div className="structure-card__header">
          {t("structure.searchTitle", "Search by login")}
        </div>
        <div className="structure-search">
          <input
            type="text"
            placeholder={t("structure.searchPlaceholder", "Enter login")}
            aria-label={t("structure.searchTitle", "Search by login")}
            value={searchLogin}
            onChange={(event) => setSearchLogin(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
          />
          <button
            type="button"
            className="btn structure-search__btn"
            onClick={handleSearch}
          >
            {t("structure.searchButton", "Search")}
          </button>
        </div>
      </div>

      <div className="structure-card">
        <div className="structure-card__header">
          {t("structure.treeTitle", "Structure")}
        </div>
        <ReferralsTree
          rootLogin={rootLogin}
          marketingAddress={marketingAddress}
          onCuratorSelect={handleCuratorSelect}
        />
      </div>
    </section>
  );
}

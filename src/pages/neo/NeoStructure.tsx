import "./neo-structure.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import NeoStructureTree from "../../components/marketing/structure/NeoStructureTree";
import { useProfileContext } from "../../context/ProfileContext";

export default function NeoStructure() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const [searchLogin, setSearchLogin] = useState(currentProfile?.login ?? "");
  const [rootLogin, setRootLogin] = useState(currentProfile?.login ?? "");

  useEffect(() => {
    const login = currentProfile?.login ?? "";
    setSearchLogin(login);
    setRootLogin(login);
  }, [currentProfile]);

  const handleSearch = () => {
    const trimmed = searchLogin.trim();
    if (!trimmed) return;
    setRootLogin(trimmed);
  };

  const handleCuratorSelect = (login: string) => {
    setSearchLogin(login);
    setRootLogin(login);
  };

  return (
    <section className="neo-structure">

      <div className="structure-card">
        <div className="structure-card__header">{t("neo.structure.searchTitle", "Search by login")}</div>
        <div className="structure-search">
          <input
            type="text"
            placeholder={t("neo.structure.searchPlaceholder", "Enter login")}
            aria-label={t("neo.structure.searchTitle", "Search by login")}
            value={searchLogin}
            onChange={(event) => setSearchLogin(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
          />
          <button type="button" className="btn structure-search__btn" onClick={handleSearch}>
            {t("neo.structure.searchButton", "Search")}
          </button>
        </div>
      </div>

      <div className="structure-card">
        <div className="structure-card__header">{t("neo.structure.treeTitle", "Structure")}</div>
        <NeoStructureTree rootLogin={rootLogin} onCuratorSelect={handleCuratorSelect} />
      </div>
    </section>
  );
}

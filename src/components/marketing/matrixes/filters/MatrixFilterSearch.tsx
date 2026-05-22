import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./matrix-filter-search.css";
import { useProfileContext } from "../../../../context/ProfileContext";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { searchPlaces, type MarketingPlace } from "../../../../services/marketingApi";

export default function MatrixFilterSearch() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddr, setSelectedPlace, selectedMatrix } = useMarketingContext();
  const [searchLogin, setSearchLogin] = useState("");
  const [results, setResults] = useState<MarketingPlace[]>([]);

  const formatLabel = (place: MarketingPlace) => `[${place.place_number}] ${place.login}`;

  useEffect(() => {
    let cancelled = false;
    const query = searchLogin.trim();
    if (!query || !currentProfile || !marketingAddr) {
      setResults([]);
      return () => {
        cancelled = true;
      };
    }

    searchPlaces(marketingAddr, selectedMatrix, currentProfile!.address, query, 1, 10).then((data) => {
      if (cancelled) return;
      setResults(data.items);
    });

    return () => {
      cancelled = true;
    };
  }, [marketingAddr, searchLogin, selectedMatrix, currentProfile]);


  const selectLogin = (place: MarketingPlace) => {
    setSelectedPlace(place.addr);
    setSearchLogin("");
    setResults([]);
  };


  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("matrix.filters.searchByLogin", "Search")}
      </span>
      <div className="filter-combobox">
        <input
          className="combobox-input"
          type="text"
          name="searchLogin"
          placeholder={t("matrix.filters.searchPlaceholder", "login")}
          value={searchLogin}
          onChange={(e) => {
            const value = e.target.value;
            setSearchLogin(value);
          }}
          aria-label="Search by login"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
        />
        {results.length > 0 && (
          <ul className="combobox-list" role="listbox">
            {results.map((place) => (
              <li
                key={place.place_number}
                className="combobox-item"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectLogin(place);
                }}
              >
                {formatLabel(place)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import {
  searchPlaces,
  type ProgramPlace,
} from "../../../services/programApi";
import "./place-search.css";

export default function PlaceSearch() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const { selectedStructure, setSelectedPlace } = useStructuresContext();
  const [searchLogin, setSearchLogin] = useState("");
  const [results, setResults] = useState<ProgramPlace[]>([]);

  const formatLabel = (place: ProgramPlace) =>
    `[${place.place_number}] ${place.profile_login ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    const query = searchLogin.trim();
    const profileAddress = currentProfile?.address;

    if (!query || !profileAddress || !marketingAddress) {
      setResults([]);
      return () => {
        cancelled = true;
      };
    }

    void searchPlaces(
      marketingAddress,
      selectedStructure,
      profileAddress,
      query,
      1,
      10,
    ).then((data) => {
      if (!cancelled) setResults(data?.items ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, searchLogin, selectedStructure]);

  const selectLogin = (place: ProgramPlace) => {
    setSelectedPlace(place);
    setSearchLogin("");
    setResults([]);
  };

  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("structure.searchTitle", "Search")}
      </span>
      <div className="filter-combobox">
        <input
          className="combobox-input"
          type="text"
          name="searchLogin"
          placeholder={t("structure.searchPlaceholder", "login")}
          value={searchLogin}
          onChange={(event) => setSearchLogin(event.target.value)}
          aria-label={t("structure.searchTitle", "Search by login")}
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
        />
        {results.length > 0 && (
          <ul className="combobox-list" role="listbox">
            {results.map((place) => (
              <li
                key={`${place.profile_addr ?? "system"}:${place.place_number}`}
                className="combobox-item"
                role="option"
                onMouseDown={(event) => {
                  event.preventDefault();
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

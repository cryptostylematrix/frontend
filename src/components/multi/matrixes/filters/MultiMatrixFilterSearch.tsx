import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-filter-search.css";
import { searchPlaces } from "../../../../services/matrixService";
import type { MatrixPlace } from "../../../../services/matrixService";
import { useProfileContext } from "../../../../context/ProfileContext";
import { useMatrixContext } from "../../../../context/MatrixContext";

interface Props {
  matrixId: number;
}

export default function MultiMatrixFilterSearch({ matrixId }: Props) {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { setSelection } = useMatrixContext();
  const [searchLogin, setSearchLogin] = useState("");
  const [results, setResults] = useState<MatrixPlace[]>([]);

  const formatLabel = (place: MatrixPlace) => `[${place.id}] ${place.index}`;

  useEffect(() => {
    let cancelled = false;
    const query = searchLogin.trim();
    if (!query || !currentProfile) {
      return () => {
        cancelled = true;
      };
    }

    searchPlaces(matrixId, currentProfile!, query, 1, 10).then((data) => {
      if (cancelled) return;
      setResults(data.items);
    });

    return () => {
      cancelled = true;
    };
  }, [matrixId, searchLogin, currentProfile]);


  const selectLogin = (place: MatrixPlace) => {
    setSelection(place.place_number, place.address);
    setSearchLogin("");
    setResults([]);
  };


  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("multiMatrix.filters.searchByLogin", "Search")}
      </span>
      <div className="filter-combobox">
        <input
          className="combobox-input"
          type="text"
          name="searchLogin"
          placeholder={t("multiMatrix.filters.searchPlaceholder", "login")}
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
                key={place.id}
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

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-filters.css";
import "./multi-matrix-filter-places.css";
import { fetchPlaces } from "../../../../services/matrixApi";
import type { MatrixPlace } from "../../../../services/matrixApi";
import { useProfileContext } from "../../../../context/ProfileContext";
import { useMatrixContext } from "../../../../context/MatrixContext";

const pad2 = (n: number) => n.toString().padStart(2, "0");

export default function MultiMatrixFilterPlaces() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { refreshKey, selectedPlaceAddress, setSelectedPlace, selectedMatrix } = useMatrixContext();

  const PAGE_SIZE = 8;
  const selectRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<MatrixPlace[]>([]);
  const [isPlacesOpen, setIsPlacesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const previousMatrixRef = useRef<number | undefined>(undefined);
  const previousProfileAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const profileAddress = currentProfile?.address;
    const matrixChanged = previousMatrixRef.current !== selectedMatrix;
    const profileChanged = previousProfileAddressRef.current !== profileAddress;

    previousMatrixRef.current = selectedMatrix;
    previousProfileAddressRef.current = profileAddress;

    setIsPlacesOpen(false);
    setPage(1);
    setTotalPages(1);
    setLoadingMore(false);

    if (!currentProfile) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPlaces(selectedMatrix, currentProfile.address, 1, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setPlaces(data.items);

        if (matrixChanged || profileChanged || !selectedPlaceAddress) {
          setSelectedPlace(data.items[0]?.addr);
        } else if (data.items.length === 0) {
          setSelectedPlace(undefined);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMatrix, currentProfile, refreshKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsPlacesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedPlaces = useMemo(() => {
    const groups: Record<string, MatrixPlace[]> = {};
    places.forEach((place) => {
      const date = new Date(Number(place.created_at));
      const dateKey = `${pad2(date.getDate())}.${pad2(
        date.getMonth() + 1
      )}.${date.getFullYear().toString().slice(-2)}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(place);
    });
    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => a.created_at - b.created_at),
      }))
      .filter((group) => group.items.length > 0);
  }, [places]);

  const formatPlaceLabel = (place: MatrixPlace) => {
    const label = `[${place.place_number}] ${place.login} (${place.fill_count}/4) ${place.clone ? t("multiMatrix.filters.clone", "clone") : ""}`;
    return { label, isFull: place.fill_count >= 4 };
  };

  const selectedPlaceLabel = useMemo(() => {
    if (loading) return t("home.loading");
    const found = places.find((p) => p.addr === selectedPlaceAddress);
    if (!found) {
      return places.length > 0 ? "..." : t("multiMatrix.filters.noPlaces", "No places");
    }
    const { label } = formatPlaceLabel(found);
    return label;
  }, [loading, places, selectedPlaceAddress, t]);

  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("multiMatrix.filters.places", "Places")}
      </span>
      <div
        ref={selectRef}
        className="custom-select"
        tabIndex={0}
      >
        <button
          type="button"
          className="custom-select__trigger"
          onClick={() => setIsPlacesOpen((prev) => !prev)}
          aria-expanded={isPlacesOpen}
          aria-haspopup="listbox"
        >
          {selectedPlaceLabel}
          <span className={`custom-select__arrow ${isPlacesOpen ? "up" : ""}`} />
        </button>

        {isPlacesOpen && (
          <div className="custom-select__menu" role="listbox">
            {loading ? (
              <div className="custom-select__loading">{t("home.loading")}</div>
            ) : places.length === 0 ? (
              <div className="custom-select__empty">
                {t("multiMatrix.filters.noPlaces", "No places")}
              </div>
            ) : (
              groupedPlaces.map(({ date, items }, idx) => (
                <Fragment key={date}>
                  <div className="custom-select__group">{date}</div>
              {items.map((place) => {
                const { label, isFull } = formatPlaceLabel(place);
                const isSelected = place.addr === selectedPlaceAddress;
                return (
                  <div
                        key={place.place_number}
                        role="option"
                        aria-selected={isSelected}
                        className={`custom-select__option ${
                          isFull ? "option-full" : ""
                        } ${isSelected ? "is-selected" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedPlace(place.addr);
                          setIsPlacesOpen(false);
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                  {idx < groupedPlaces.length - 1 && (
                    <div className="custom-select__separator">─────────────</div>
                  )}
                </Fragment>
              ))
            )}

            {!loading && places.length > 0 && page < totalPages && (
              <button
                type="button"
                className="custom-select__load-more"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (loadingMore) return;
                  setLoadingMore(true);
                  fetchPlaces(selectedMatrix, currentProfile!.address, page + 1, PAGE_SIZE)
                    .then((data) => {
                      setPlaces((prev) => [...prev, ...data.items]);
                      setPage(data.page);
                      setTotalPages(data.total_pages);
                    })
                    .finally(() => setLoadingMore(false));
                }}
                disabled={loadingMore}
              >
                {loadingMore ? t("home.loading") : t("multiMatrix.filters.loadMore", "Load more")}
              </button>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

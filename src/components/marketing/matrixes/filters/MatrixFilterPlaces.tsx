import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./matrix-filters.css";
import "./matrix-filter-places.css";
import { useProfileContext } from "../../../../context/ProfileContext";
import { useMarketingContext } from "../../../../context/MarketingContext";
import { fetchPlaces, getPlacesCount, type MarketingPlace } from "../../../../services/marketingApi";

const pad2 = (n: number) => n.toString().padStart(2, "0");

export default function MatrixFilterPlaces() {
  const { t, i18n } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddr, refreshKey, selectedPlaceAddress, setSelectedPlace, selectedMatrix } = useMarketingContext();

  const PAGE_SIZE = 8;
  const selectRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<MarketingPlace[]>([]);
  const [isPlacesOpen, setIsPlacesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [placesCount, setPlacesCount] = useState(0);
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

    if (!currentProfile || !marketingAddr) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPlaces(marketingAddr, selectedMatrix, currentProfile.address, 1, PAGE_SIZE)
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
  }, [marketingAddr, selectedMatrix, currentProfile, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    if (!currentProfile || !marketingAddr) {
      setPlacesCount(0);
      return;
    }

    getPlacesCount(marketingAddr, selectedMatrix, currentProfile.address).then((count) => {
      if (cancelled) return;
      setPlacesCount(count);
    });

    return () => {
      cancelled = true;
    };
  }, [marketingAddr, selectedMatrix, currentProfile, refreshKey]);

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
    const groups: Record<string, MarketingPlace[]> = {};
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

  const formatPlaceLabel = (place: MarketingPlace) => {
    const label = `[${place.place_number}] ${place.login}`;
    return { label, isFull: false };
  };

  const selectedPlaceLabel = useMemo(() => {
    if (loading) return t("home.loading");
    const found = places.find((p) => p.addr === selectedPlaceAddress);
    if (!found) {
      return places.length > 0 ? "..." : t("matrix.filters.noPlaces", "No places");
    }
    const { label } = formatPlaceLabel(found);
    return label;
  }, [loading, places, selectedPlaceAddress, t]);

  const placesLabel = useMemo(() => {
    const formattedTotal = new Intl.NumberFormat(i18n.language).format(placesCount);
    return t("matrix.filters.placesWithTotal", { total: formattedTotal });
  }, [i18n.language, placesCount, t]);

  return (
    <label className="filter-field">
      <span className="filter-label">{placesLabel}</span>
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
          <span className="custom-select__trigger-label">{selectedPlaceLabel}</span>
          <span className={`custom-select__arrow ${isPlacesOpen ? "up" : ""}`} />
        </button>

        {isPlacesOpen && (
          <div className="custom-select__menu" role="listbox">
            {loading ? (
              <div className="custom-select__loading">{t("home.loading")}</div>
            ) : places.length === 0 ? (
              <div className="custom-select__empty">
                {t("matrix.filters.noPlaces", "No places")}
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
                  fetchPlaces(marketingAddr, selectedMatrix, currentProfile!.address, page + 1, PAGE_SIZE)
                    .then((data) => {
                      setPlaces((prev) => [...prev, ...data.items]);
                      setPage(data.page);
                      setTotalPages(data.total_pages);
                    })
                    .finally(() => setLoadingMore(false));
                }}
                disabled={loadingMore}
              >
                {loadingMore ? t("home.loading") : t("matrix.filters.loadMore", "Load more")}
              </button>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

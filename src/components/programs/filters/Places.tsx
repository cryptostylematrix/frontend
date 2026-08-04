import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import {
  getPlaces,
  getPlacesCount,
  type ProgramPlace,
} from "../../../services/programApi";
import "./filters.css";
import "./places.css";

const PAGE_SIZE = 8;
const pad2 = (value: number) => value.toString().padStart(2, "0");

export default function Places() {
  const { t, i18n } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const {
    refreshKey,
    selectedPlace,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();

  const selectRef = useRef<HTMLDivElement>(null);
  const previousStructureRef = useRef<number | undefined>(undefined);
  const previousProfileAddressRef = useRef<string | undefined>(undefined);
  const [places, setPlaces] = useState<ProgramPlace[]>([]);
  const [isPlacesOpen, setIsPlacesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [placesCount, setPlacesCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const profileAddress = currentProfile?.address;
    const structureChanged =
      previousStructureRef.current !== selectedStructure;
    const profileChanged =
      previousProfileAddressRef.current !== profileAddress;

    previousStructureRef.current = selectedStructure;
    previousProfileAddressRef.current = profileAddress;

    setIsPlacesOpen(false);
    setPage(1);
    setTotalPages(1);
    setLoadingMore(false);

    if (!profileAddress || !marketingAddress) {
      setPlaces([]);
      setSelectedPlace(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void getPlaces(
      marketingAddress,
      selectedStructure,
      profileAddress,
      1,
      PAGE_SIZE,
    )
      .then((data) => {
        if (cancelled || !data) return;

        setPlaces(data.items);
        if (structureChanged || profileChanged || !selectedPlace) {
          setSelectedPlace(data.items[0] ?? null);
        } else if (data.items.length === 0) {
          setSelectedPlace(null);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentProfile,
    marketingAddress,
    refreshKey,
    selectedStructure,
    setSelectedPlace,
  ]);

  useEffect(() => {
    let cancelled = false;
    const profileAddress = currentProfile?.address;

    if (!profileAddress || !marketingAddress) {
      setPlacesCount(0);
      return;
    }

    void getPlacesCount(
      marketingAddress,
      selectedStructure,
      profileAddress,
    ).then((response) => {
      if (!cancelled) setPlacesCount(response?.count ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

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
    const groups: Record<string, ProgramPlace[]> = {};
    places.forEach((place) => {
      const date = new Date(Number(place.created_at) * 1_000);
      const dateKey = `${pad2(date.getDate())}.${pad2(
        date.getMonth() + 1,
      )}.${date.getFullYear().toString().slice(-2)}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(place);
    });

    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        items: items.sort((left, right) => left.created_at - right.created_at),
      }))
      .filter((group) => group.items.length > 0);
  }, [places]);

  const formatPlaceLabel = (place: ProgramPlace) => ({
    label: `[${place.place_number}] ${place.profile_login ?? ""}`,
    isFull: false,
  });

  const selectedPlaceLabel = useMemo(() => {
    if (loading) return t("home.loading");
    const found = places.find(
      (place) =>
        place.profile_addr === selectedPlace?.profile_addr &&
        place.place_number === selectedPlace?.place_number,
    );
    if (!found) {
      return places.length > 0 ? "..." : t("structure.noPlaces", "No places");
    }
    return formatPlaceLabel(found).label;
  }, [loading, places, selectedPlace, t]);

  const placesLabel = useMemo(() => {
    const formattedTotal = new Intl.NumberFormat(i18n.language).format(
      placesCount,
    );
    return t("structure.placesWithTotal", {
      total: formattedTotal,
      defaultValue: `Places (total ${formattedTotal})`,
    });
  }, [i18n.language, placesCount, t]);

  return (
    <label className="filter-field">
      <span className="filter-label">{placesLabel}</span>
      <div ref={selectRef} className="custom-select" tabIndex={0}>
        <button
          type="button"
          className="custom-select__trigger"
          onClick={() => setIsPlacesOpen((open) => !open)}
          aria-expanded={isPlacesOpen}
          aria-haspopup="listbox"
        >
          <span className="custom-select__trigger-label">
            {selectedPlaceLabel}
          </span>
          <span
            className={`custom-select__arrow ${isPlacesOpen ? "up" : ""}`}
          />
        </button>

        {isPlacesOpen && (
          <div className="custom-select__menu" role="listbox">
            {loading ? (
              <div className="custom-select__loading">{t("home.loading")}</div>
            ) : places.length === 0 ? (
              <div className="custom-select__empty">
                {t("structure.noPlaces", "No places")}
              </div>
            ) : (
              groupedPlaces.map(({ date, items }, index) => (
                <Fragment key={date}>
                  <div className="custom-select__group">{date}</div>
                  {items.map((place) => {
                    const { label, isFull } = formatPlaceLabel(place);
                    const isSelected =
                      place.profile_addr === selectedPlace?.profile_addr &&
                      place.place_number === selectedPlace?.place_number;
                    return (
                      <div
                        key={place.place_number}
                        role="option"
                        aria-selected={isSelected}
                        className={`custom-select__option ${
                          isFull ? "option-full" : ""
                        } ${isSelected ? "is-selected" : ""}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSelectedPlace(place);
                          setIsPlacesOpen(false);
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                  {index < groupedPlaces.length - 1 && (
                    <div className="custom-select__separator">
                      ─────────────
                    </div>
                  )}
                </Fragment>
              ))
            )}

            {!loading && places.length > 0 && page < totalPages && (
              <button
                type="button"
                className="custom-select__load-more"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const profileAddress = currentProfile?.address;
                  if (loadingMore || !profileAddress) return;

                  setLoadingMore(true);
                  void getPlaces(
                    marketingAddress,
                    selectedStructure,
                    profileAddress,
                    page + 1,
                    PAGE_SIZE,
                  )
                    .then((data) => {
                      if (!data) return;
                      setPlaces((current) => [...current, ...data.items]);
                      setPage(data.page);
                      setTotalPages(data.total_pages);
                    })
                    .finally(() => setLoadingMore(false));
                }}
                disabled={loadingMore}
              >
                {loadingMore
                  ? t("home.loading")
                  : t("structure.loadMore", "Load more")}
              </button>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

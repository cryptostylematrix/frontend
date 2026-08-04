import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProgramContext } from "../../context/ProgramContext";
import { useStructuresContext } from "../../context/StructuresContext";
import { getPath, type ProgramPlace } from "../../services/programApi";
import "./place-bread-crumbs.css";

export default function PlaceBreadCrumbs() {
  const { t } = useTranslation();
  const { marketingAddress } = useProgramContext();
  const {
    firstPlace,
    refreshKey,
    selectedPlace,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();
  const [path, setPath] = useState<ProgramPlace[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!marketingAddress || !firstPlace || !selectedPlace) {
      setPath(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPath(null);
    void getPath(
      marketingAddress,
      selectedStructure,
      firstPlace.profile_addr,
      firstPlace.place_number,
      selectedPlace.profile_addr,
      selectedPlace.place_number,
    )
      .then((places) => {
        if (!cancelled) setPath(places);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    firstPlace,
    marketingAddress,
    refreshKey,
    selectedPlace,
    selectedStructure,
  ]);

  const selectedPlaceKey = useMemo(
    () =>
      selectedPlace
        ? `${selectedPlace.profile_addr ?? ""}:${selectedPlace.place_number}`
        : null,
    [selectedPlace],
  );

  const items = path ?? [];

  return (
    <div className="matrix-row structure-row--breadcrumbs">
      {loading ? (
        <p className="placeholder-text">
          {t("structure.loading", "Loading path...")}
        </p>
      ) : !items.length ? (
        <p className="breadcrumbs-placeholder">
          {t(
            "structure.breadcrumbsPlaceholder",
            "Breadcrumbs will appear here once a place is selected.",
          )}
        </p>
      ) : (
        <nav aria-label={t("structure.breadcrumbsTitle", "Breadcrumb")}>
          <ol className="breadcrumbs">
            {items.map((item, index) => {
              const itemKey = `${item.profile_addr ?? ""}:${item.place_number}`;
              const label = `#${item.place_number} ${item.profile_login ?? ""}`;
              const isSelected = itemKey === selectedPlaceKey;

              return (
                <li key={itemKey} className="breadcrumb-item">
                  {isSelected ? (
                    <span className="breadcrumb-current">{label}</span>
                  ) : (
                    <button
                      type="button"
                      className="breadcrumb-link"
                      onClick={() =>
                        setSelectedPlace({
                          profile_addr: item.profile_addr,
                          place_number: item.place_number,
                        })
                      }
                    >
                      {label}
                    </button>
                  )}
                  {index < items.length - 1 && (
                    <span className="breadcrumb-sep">/</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}

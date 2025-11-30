import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./multi-matrix-filters.css";
import "./multi-matrix-filter-locks.css";
import "./multi-matrix-filter-places.css";
import { fetchLocks } from "../../../../services/matrixService";
import type { MatrixPlace } from "../../../../services/matrixService";
import { useProfileContext } from "../../../../context/ProfileContext";
import { useMatrixContext } from "../../../../context/MatrixContext";

export default function MultiMatrixFilterLocks() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { selectedPlaceAddress, setSelectedPlace, selectedMatrix } = useMatrixContext();
  const [locks, setLocks] = useState<MatrixPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    let cancelled = false;
    setIsOpen(false);
    setPage(1);
    setTotalPages(1);
    setLoadingMore(false);

    if (!currentProfile) {
      setLocks([]);
      return;
    }

    setLoading(true);
    fetchLocks(selectedMatrix, currentProfile!.address, 1, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setLocks(data.items);
    
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMatrix, currentProfile]);

  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("multiMatrix.filters.locks", "Locks")}
      </span>
      <div className="custom-select" tabIndex={0} onBlur={() => setIsOpen(false)}>
        <button
          type="button"
          className="custom-select__trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={loading}
        >
          {loading
            ? t("home.loading")
            : selectedPlaceAddress
              ? (() => {
                  const selected = locks.find((l) => l.address === selectedPlaceAddress);
                  if (!selected) {
                    return locks.length > 0 ? "..." : t("multiMatrix.filters.noLocks", "No locks");
                  }
                  return `[${selected.place_number}] ${selected.login}`;
                })()
              : locks.length > 0
                ? "..."
                : t("multiMatrix.filters.noLocks", "No locks")}
          <span className={`custom-select__arrow ${isOpen ? "up" : ""}`} />
        </button>

        {isOpen && (
          <div className="custom-select__menu" role="listbox">
            {loading ? (
              <div className="custom-select__loading">{t("home.loading")}</div>
            ) : locks.length === 0 ? (
              <div className="custom-select__empty">
                {t("multiMatrix.filters.noLocks", "No locks")}
              </div>
            ) : (
              <>
                {locks.map((lock) => {
                  const label = `[${lock.place_number}] ${lock.login}`;
                  const isSelected = lock.address === selectedPlaceAddress;
                  return (
                    <div
                      key={lock.place_number}
                      role="option"
                      aria-selected={isSelected}
                      className={`custom-select__option ${isSelected ? "is-selected" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedPlace(lock.address);
                        setIsOpen(false);
                      }}
                    >
                      {label}
                    </div>
                  );
                })}

                {page < totalPages && (
                  <button
                    type="button"
                    className="custom-select__load-more"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (loadingMore) return;
                      setLoadingMore(true);
                  fetchLocks(selectedMatrix, currentProfile!.address, page + 1, PAGE_SIZE)
                    .then((data) => {
                      setLocks((prev) => [...prev, ...data.items]);
                      setPage(data.page);
                      setTotalPages(data.totalPages);
                    })
                        .finally(() => setLoadingMore(false));
                    }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? t("home.loading") : t("multiMatrix.filters.loadMore", "Load more")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

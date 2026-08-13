import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import { getLocks, type ProgramLock } from "../../../services/programApi";
import "./filters.css";
import "./locks.css";
import "./places.css";

const PAGE_SIZE = 8;

export default function Locks() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const {
    refreshKey,
    selectedPlace,
    selectedStructure,
    setSelectedPlace,
  } = useStructuresContext();
  const [locks, setLocks] = useState<ProgramLock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const profileAddress = currentProfile?.address;

    setIsOpen(false);
    setPage(1);
    setTotalPages(1);
    setLoadingMore(false);

    if (!profileAddress || !marketingAddress) {
      setLocks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void getLocks(
      marketingAddress,
      selectedStructure,
      profileAddress,
      1,
      PAGE_SIZE,
    )
      .then((data) => {
        if (cancelled || !data) return;
        setLocks(data.items);
        setPage(data.page);
        setTotalPages(data.total_pages);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, marketingAddress, refreshKey, selectedStructure]);

  return (
    <label className="filter-field">
      <span className="filter-label">
        {t("structure.locks", "Locks")}
      </span>
      <div className="custom-select" tabIndex={0} onBlur={() => setIsOpen(false)}>
        <button
          type="button"
          className="custom-select__trigger"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={loading}
        >
          {loading
            ? t("home.loading")
            : locks.length > 0
              ? "..."
              : t("structure.noLocks", "No locks")}
          <span className={`custom-select__arrow ${isOpen ? "up" : ""}`} />
        </button>

        {isOpen && (
          <div className="custom-select__menu" role="listbox">
            {loading ? (
              <div className="custom-select__loading">{t("home.loading")}</div>
            ) : locks.length === 0 ? (
              <div className="custom-select__empty">
                {t("structure.noLocks", "No locks")}
              </div>
            ) : (
              <>
                {locks.map((lock) => {
                  const label = `[${lock.place_number}] ${lock.place_profile_login} (${lock.locked_pos})`;
                  const isSelected =
                    lock.place_profile_addr === selectedPlace?.profile_addr &&
                    lock.place_number === selectedPlace?.place_number;

                  return (
                    <div
                      key={`${lock.place_profile_addr}:${lock.place_number}:${lock.locked_pos}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`custom-select__option ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedPlace({
                          profile_addr: lock.place_profile_addr,
                          place_number: lock.place_number,
                        });
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
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const profileAddress = currentProfile?.address;
                      if (loadingMore || !profileAddress) return;

                      setLoadingMore(true);
                      void getLocks(
                        marketingAddress,
                        selectedStructure,
                        profileAddress,
                        page + 1,
                        PAGE_SIZE,
                      )
                        .then((data) => {
                          if (!data) return;
                          setLocks((current) => [...current, ...data.items]);
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
              </>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

import "./matrix-bread-crumbs.css";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPath, type MarketingPlace } from "../../../services/marketingApi";
import { useMarketingContext } from "../../../context/MarketingContext";

export default function MatrixBreadCrumbs() {
  const { t } = useTranslation();
  const { marketingAddr, refreshKey, selectedPlaceAddress, rootPlaceAddress, setSelectedPlace } = useMarketingContext();
  const [path, setPath] = useState<MarketingPlace[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!marketingAddr || !rootPlaceAddress || !selectedPlaceAddress) {
      setPath(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPath(null);
    getPath(marketingAddr, rootPlaceAddress, selectedPlaceAddress)
      .then((places) => {
        if (cancelled) return;
        setPath(places);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketingAddr, rootPlaceAddress, selectedPlaceAddress, refreshKey]);

  const selectedAddress = useMemo(
    () => selectedPlaceAddress || rootPlaceAddress,
    [selectedPlaceAddress, rootPlaceAddress]
  );

  const items = path ?? [];

  return (
    <div className="matrix-row matrix-row--breadcrumbs">
      {loading ? (
        <p className="placeholder-text">{t("matrix.tree.loadingPath", "Loading path...")}</p>
      ) : !items.length ? (
        <p className="breadcrumbs-placeholder">
          {t("matrix.tree.breadcrumbEmpty", "Breadcrumbs will appear here once a place is selected.")}
        </p>
      ) : (
        <nav aria-label={t("matrix.tree.breadcrumbs", "Breadcrumb")}>
          <ol className="breadcrumbs">
            {items.map((item, index) => {
              const label = `#${item.place_number} ${item.login}`;
              const isSelected = item.addr === selectedAddress;
              return (
                <li key={item.addr} className="breadcrumb-item">
                  {isSelected ? (
                    <span className="breadcrumb-current">{label}</span>
                  ) : (
                    <button
                      type="button"
                      className="breadcrumb-link"
                      onClick={() => setSelectedPlace(item.addr)}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      {label}
                    </button>
                  )}
                  {index < items.length - 1 && <span className="breadcrumb-sep">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}

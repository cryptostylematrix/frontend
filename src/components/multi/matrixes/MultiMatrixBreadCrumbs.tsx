import "./multi-matrix-bread-crumbs.css";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPath } from "../../../services/matrixApi";
import type { MatrixPlace } from "../../../services/matrixApi";
import { useMatrixContext } from "../../../context/MatrixContext";

export default function MultiMatrixBreadCrumbs() {
  const { t } = useTranslation();
  const { selectedPlaceAddress, rootPlaceAddress, setSelectedPlace } = useMatrixContext();
  const [path, setPath] = useState<MatrixPlace[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!rootPlaceAddress || !selectedPlaceAddress) {
      setPath(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPath(null);
    getPath(rootPlaceAddress, selectedPlaceAddress)
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
  }, [rootPlaceAddress, selectedPlaceAddress]);

  const selectedAddress = useMemo(
    () => selectedPlaceAddress || rootPlaceAddress,
    [selectedPlaceAddress, rootPlaceAddress]
  );

  const items = path ?? [];

  return (
    <div className="matrix-row matrix-row--breadcrumbs">
      {loading ? (
        <p className="placeholder-text">{t("multiMatrix.tree.loadingPath", "Loading path...")}</p>
      ) : !items.length ? (
        <p className="breadcrumbs-placeholder">
          {t("multiMatrix.tree.breadcrumbEmpty", "Breadcrumbs will appear here once a place is selected.")}
        </p>
      ) : (
        <nav aria-label={t("multiMatrix.tree.breadcrumbs", "Breadcrumb")}>
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

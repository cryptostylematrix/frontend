import "./warning-block.css";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WarningBlock() {
  const { t } = useTranslation();

  return (
    <div className="warning-block" role="alert" aria-live="polite">
      <div className="warning-icon">
        <AlertTriangle size={22} strokeWidth={1.8} />
      </div>

      <div className="warning-text">
        <strong>{t("common.warning.title")}</strong>
        <p>{t("common.warning.description")}</p>
      </div>
    </div>
  );
}

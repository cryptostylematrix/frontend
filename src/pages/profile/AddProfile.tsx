import React, { useState, useContext } from "react";
import "./add-profile.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { Save, X } from "lucide-react";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { translateError } from "../../errors/errorUtils";
import { ErrorCode } from "../../errors/ErrorCodes";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AddProfile() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { addProfile } = useProfileContext();
  const [login, setLogin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);
  const [previewLogin, setPreviewLogin] = useState<string | null>(null);

  const navigate = useNavigate();

  // 🧩 Require wallet connection
  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCodes(null);

    if (!wallet) {
      setErrorCodes([ErrorCode.INVALID_WALLET_ADDRESS]);
      return;
    }

    const trimmed = login.trim();
    if (!trimmed) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]); // or define a new ErrInvalidLogin
      return;
    }

    setIsSubmitting(true);

    const result = await addProfile(wallet, trimmed);

    if (result?.success === false) {
      if ("previewAvailable" in result && result.previewAvailable) {
        setPreviewLogin(trimmed);
      } else {
        setErrorCodes(result.errors);
      }
    } else if (result?.success === true) {
      navigate("/"); // redirect after success
    }

    setIsSubmitting(false);
  };

  return (
    <div className="add-profile-container">
      <form onSubmit={handleSubmit} className="fields">
        <label className="field">
          <span className="label-text">{t("profile.add_login_label")}</span>
          <input
            type="text"
            maxLength={40}
            placeholder={t("profile.add_login_placeholder")}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>

        {errorCodes && errorCodes.length > 0 && (
          <div className="error-message">
            {errorCodes.map((code) => (
              <div key={code}>{translateError(t, code)}</div>
            ))}
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="btn cancel"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            <X className="btn-icon" /> {t("profile.cancel_btn")}
          </button>

          <button type="submit" className="btn submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="spinner" />
            ) : (
              <>
                <Save className="btn-icon" /> {t("profile.add_btn")}
              </>
            )}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={previewLogin !== null}
        title={t("profile.preview_confirm_title", "Profile belongs to another wallet")}
        message={t(
          "profile.preview_confirm_message",
          "This profile belongs to another wallet. Would you like to add it in preview mode?",
        )}
        confirmLabel={t("profile.preview_add_btn", "Add in preview mode")}
        cancelLabel={t("profile.cancel_btn", "Cancel")}
        onCancel={() => setPreviewLogin(null)}
        onConfirm={() => {
          const confirmedLogin = previewLogin;
          setPreviewLogin(null);
          if (!confirmedLogin) return;

          setIsSubmitting(true);
          setErrorCodes(null);
          void addProfile(wallet, confirmedLogin, { allowPreview: true })
            .then((result) => {
              if (result.success) navigate("/");
              else setErrorCodes(result.errors);
            })
            .finally(() => setIsSubmitting(false));
        }}
      />
    </div>
  );
}

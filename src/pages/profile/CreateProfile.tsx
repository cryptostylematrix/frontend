import React, { useState, useContext } from "react";
import "./create-profile.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { Save, X } from "lucide-react";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { translateError } from "../../errors/errorUtils";
import { ErrorCode } from "../../errors/ErrorCodes";

export default function CreateProfile() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { createProfile } = useProfileContext();
  const navigate = useNavigate();

  // Form fields
  const [login, setLogin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tgUsername, setTgUsername] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);

  // Require wallet connection
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

    const trimmedLogin = login.trim();
    if (!trimmedLogin) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]); // or define ErrInvalidLogin
      return;
    }

    setIsSubmitting(true);

    const result = await createProfile(
      wallet,
      trimmedLogin,
      imageUrl.trim(),
      firstName.trim(),
      lastName.trim(),
      tgUsername.trim()
    );

    if (result?.success === false) {
      setErrorCodes(result.errors);
    } else if (result?.success === true) {
      navigate("/");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="create-profile-container">
      <form onSubmit={handleSubmit} className="fields">
        {/* Login */}
        <label className="field">
          <span className="label-text">
            {t("profile.create_login_label")} *
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.create_login_placeholder")}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>

        {/* First name */}
        <label className="field">
          <span className="label-text">
            {t("profile.create_firstname_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.create_firstname_placeholder")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {/* Last name */}
        <label className="field">
          <span className="label-text">
            {t("profile.create_lastname_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.create_lastname_placeholder")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {/* Avatar */}
        <label className="field">
          <span className="label-text">
            {t("profile.create_avatar_label")}
          </span>
          <input
            type="url"
            maxLength={300}
            placeholder={t("profile.create_avatar_placeholder")}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {/* Telegram */}
        <label className="field">
          <span className="label-text">
            {t("profile.create_telegram_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.create_telegram_placeholder")}
            value={tgUsername}
            onChange={(e) => setTgUsername(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {/* Errors */}
        {errorCodes && errorCodes.length > 0 && (
          <div className="error-message">
            {errorCodes.map((code) => (
              <div key={code}>{translateError(t, code)}</div>
            ))}
          </div>
        )}

        {/* Actions */}
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
                <Save className="btn-icon" /> {t("profile.create_btn")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

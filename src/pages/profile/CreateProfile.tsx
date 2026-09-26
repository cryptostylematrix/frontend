import React, { useState, useContext, useEffect, useRef } from "react";
import "./create-profile.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { Save, X } from "lucide-react";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { translateError } from "../../errors/errorUtils";
import type { PendingProfileCreation } from "../../services/profileService";
import { ErrorCode } from "../../errors/ErrorCodes";
import {
  isValidProfileLogin,
  PROFILE_LOGIN_MAX_LENGTH,
  PROFILE_LOGIN_MIN_LENGTH,
  PROFILE_LOGIN_PATTERN,
} from "../../utils/profileLogin";

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

  const [pending, setPending] = useState<PendingProfileCreation | null>(null);
  const operationRef = useRef(0);
  const busyRef = useRef(false);
  useEffect(() => {
    operationRef.current += 1;
    busyRef.current = false;
    setPending(null);
    setIsSubmitting(false);
    setErrorCodes(null);
    return () => { operationRef.current += 1; };
  }, [wallet]);

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
    if (!isValidProfileLogin(trimmedLogin)) {
      setErrorCodes([ErrorCode.INVALID_PROFILE_LOGIN_FORMAT]);
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;
    const operation = operationRef.current;
    setIsSubmitting(true);
    try {
      const result = await createProfile(
        wallet,
        trimmedLogin,
        imageUrl.trim(),
        firstName.trim(),
        lastName.trim(),
        tgUsername.trim(),
        {
          pending: pending ?? undefined,
          onSubmitted: (submitted) => {
            if (operationRef.current === operation) setPending(submitted);
          },
        },
      );
      if (operationRef.current !== operation) return;
      if (!result.success) {
        setErrorCodes(result.errors);
        setPending("pending" in result ? result.pending : null);
      } else {
        navigate("/");
      }
    } catch {
      if (operationRef.current === operation) setErrorCodes([ErrorCode.NETWORK_ERROR]);
    } finally {
      if (operationRef.current === operation) {
        busyRef.current = false;
        setIsSubmitting(false);
      }
    }
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
            minLength={PROFILE_LOGIN_MIN_LENGTH}
            maxLength={PROFILE_LOGIN_MAX_LENGTH}
            pattern={PROFILE_LOGIN_PATTERN}
            placeholder={t("profile.create_login_placeholder")}
            value={login}
            onChange={(e) => setLogin(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            disabled={isSubmitting || pending !== null}
          />
          <span className="field-hint">
            {t("profile.create_login_hint")}
          </span>
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
            disabled={isSubmitting || pending !== null}
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
            disabled={isSubmitting || pending !== null}
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
            disabled={isSubmitting || pending !== null}
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
            disabled={isSubmitting || pending !== null}
          />
        </label>

        {isSubmitting && pending && (
          <p role="status" aria-live="polite">{t("profile.create_waiting_confirmation")}</p>
        )}

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
                <Save className="btn-icon" /> {t(pending ? "profile.create_retry_confirmation" : "profile.create_btn")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState, useContext } from "react";
import "./update-profile.css";
import { useTranslation } from "react-i18next";
import { Save, LogOut } from "lucide-react";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { ErrorCode } from "../../errors/ErrorCodes";
import { translateError } from "../../errors/errorUtils";

type ProfileData = {
  avatar: string;
  firstName: string;
  lastName: string;
  telegram: string;
};

export default function UpdateProfile() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile, updateCurrentProfile, removeProfile } =
    useProfileContext();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [errorCodes, setErrorCodes] = useState<ErrorCode[] | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    avatar: "",
    firstName: "",
    lastName: "",
    telegram: "",
  });

  useEffect(() => {
    if (currentProfile) {
      setProfile({
        avatar: currentProfile.imageUrl || "",
        firstName: currentProfile.firstName || "",
        lastName: currentProfile.lastName || "",
        telegram: currentProfile.tgUsername || "",
      });
    } else {
      setProfile({ avatar: "", firstName: "", lastName: "", telegram: "" });
    }
  }, [currentProfile]);

  // 🧩 Require wallet & profile connection
  if (!wallet) return <ProfileStatusBlock type="wallet" />;
  if (!currentProfile) return <ProfileStatusBlock type="profile" />;

  const update = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K]
  ) => setProfile((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setMessage(null);
    setErrorCodes(null);

    if (!wallet || !currentProfile) {
      setErrorCodes([ErrorCode.PROFILE_NOT_FOUND]);
      return;
    }

    setLoading(true);
    const result = await updateCurrentProfile(wallet, {
      imageUrl: profile.avatar.trim(),
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      tgUsername: profile.telegram.trim(),
    });

    if (result?.success === true) {
      setMessage({ type: "success", text: t("profile.update_success") });
    } else if (result?.success === false) {
      setErrorCodes(result.errors);
      setMessage(null);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    if (!wallet || !currentProfile) return;
    if (!window.confirm(t("profile.confirm_logout"))) return;

    removeProfile(wallet, currentProfile.login);
    setMessage({ type: "success", text: t("profile.removed") });
  };

  return (
    <div className="profile-card">
      <div className="fields">
        <label className="field">
          <span className="label-text">
            {t("profile.update_avatar_label")}
          </span>
          <input
            type="url"
            maxLength={300}
            placeholder={t("profile.update_avatar_placeholder")}
            value={profile.avatar}
            onChange={(e) => update("avatar", e.target.value)}
            disabled={loading}
          />
        </label>

        <label className="field">
          <span className="label-text">
            {t("profile.update_firstname_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.update_firstname_placeholder")}
            value={profile.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            disabled={loading}
          />
        </label>

        <label className="field">
          <span className="label-text">
            {t("profile.update_lastname_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.update_lastname_placeholder")}
            value={profile.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            disabled={loading}
          />
        </label>

        <label className="field">
          <span className="label-text">
            {t("profile.update_telegram_label")}
          </span>
          <input
            type="text"
            maxLength={30}
            placeholder={t("profile.update_telegram_placeholder")}
            value={profile.telegram}
            onChange={(e) => update("telegram", e.target.value)}
            disabled={loading}
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
          <button className="btn save" onClick={handleSave} disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <Save className="btn-icon" /> {t("profile.save_btn")}
              </>
            )}
          </button>

          <button
            className="btn logout"
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut className="btn-icon" /> {t("profile.logout_btn")}
          </button>
        </div>

        {message && (
          <div className={`op-message ${message.type}`}>{message.text}</div>
        )}
      </div>
    </div>
  );
}

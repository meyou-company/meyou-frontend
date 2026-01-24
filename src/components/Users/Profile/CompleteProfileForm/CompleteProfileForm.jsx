import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { profileApi } from "../../../../services/profileApi";
import { locationApi } from "../../../../services/locationApi";

import { hobbyOptions, maritalStatusOptions } from "../../../../utils/profileOptions";
import { validateCompleteProfile } from "../../../../utils/validationCompleteProfile";

import "./CompleteProfileForm.scss";
import ThemeToggleDark from "../../../../components/ThemeToggleDark/ThemeToggleDark";
import { useAuthStore } from "../../../../zustand/useAuthStore";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  nationality: "",
  username: "",
  bio: "",
  hobbies: [],
  maritalStatus: null,
  country: null,
  city: null,
};
const normalizePhone = (s = "") => s.replace(/[^\d+]/g, "");

export default function CompleteProfileForm({ onBack, onSuccess }) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profileCompleted, setProfileCompleted] = useState(false);

  const [countryOptions, setCountryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);

  const refreshMe = useAuthStore((s) => s.refreshMe);

  // avatar
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // cleanup preview url
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // react-select portal
  const selectPortalTarget = typeof window !== "undefined" ? document.body : null;

  const selectCommonProps = useMemo(() => {
    if (!selectPortalTarget) return {};
    return {
      menuPortalTarget: selectPortalTarget,
      menuPosition: "fixed",
      styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
    };
  }, [selectPortalTarget]);

  // load countries
  useEffect(() => {
    let alive = true;
    locationApi
      .getCountries()
      .then((opts) => alive && setCountryOptions(opts))
      .catch(() => alive && setCountryOptions([]));
    return () => {
      alive = false;
    };
  }, []);

  // ✅ prefill from backend: GET /users/profile/status
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await profileApi.getProfileStatus(); // { profileCompleted, user }
        if (!alive || !res?.user) return;

        setProfileCompleted(Boolean(res.profileCompleted));

        const u = res.user;

        const hobbiesSelected = Array.isArray(u.hobbies)
          ? hobbyOptions.filter((o) => u.hobbies.includes(o.value))
          : [];

        const maritalSelected =
          maritalStatusOptions.find((o) => o.value === u.maritalStatus) || null;

        const countrySelected = u.country ? { value: u.country, label: u.country } : null;
        const citySelected = u.city ? { value: u.city, label: u.city } : null;

        setValues((prev) => ({
          ...prev,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phone: u.phone || "",
          nationality: u.nationality || "",
          username: u.username || "",
          bio: u.bio || "",
          hobbies: hobbiesSelected,
          maritalStatus: maritalSelected,
          country: countrySelected,
          city: citySelected,
        }));

        // load cities if country exists
        if (u.country) {
          setIsCitiesLoading(true);
          const cities = await locationApi.getCitiesByCountry(u.country);
          if (!alive) return;
          setCityOptions(cities);
          setIsCitiesLoading(false);
        } else {
          setCityOptions([]);
        }
      } catch {
        // ignore
      } finally {
        alive && setIsCitiesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // when country changes -> load cities
  useEffect(() => {
    let alive = true;

    (async () => {
      const countryName = values.country?.value;

      if (!countryName) {
        setCityOptions([]);
        setValues((v) => ({ ...v, city: null }));
        return;
      }

      setIsCitiesLoading(true);
      try {
        const cities = await locationApi.getCitiesByCountry(countryName);
        if (!alive) return;

        setCityOptions(cities);

        const currentCity = values.city?.value;
        if (currentCity && cities.some((c) => c.value === currentCity)) return;

        setValues((v) => ({ ...v, city: null }));
      } finally {
        alive && setIsCitiesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.country?.value]);

  // validate on change
  useEffect(() => {
    const normalized = normalizeForValidation(values);
    setErrors(validateCompleteProfile(normalized));
  }, [values]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const onBlur = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const setField = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setSubmitError("");
  };

  const showError = (key) => Boolean(touched[key] && errors[key]);

  const showStar = (key) => {
    const requiredKeys = [
      "lastName",
      "firstName",
      "phone",
      "nationality",
      "hobbies",
      "maritalStatus",
      "country",
      "city",
    ];
    if (!requiredKeys.includes(key)) return false;

    const v = values[key];
    const isEmpty =
      v === null ||
      v === undefined ||
      (typeof v === "string" && !v.trim()) ||
      (Array.isArray(v) && v.length === 0);

    if (isEmpty) return true;
    if (touched[key] && errors[key]) return true;

    return false;
  };

  const handlePickAvatar = () => fileRef.current?.click();

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setAvatarFile(f);

    // revoke old preview
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    // поки немає ендпоінта — просто preview
    console.log("avatar ready:", avatarFile);
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitError("");

  const allTouched = {
    firstName: true,
    lastName: true,
    phone: true,
    nationality: true,
    username: true,
    bio: true,
    hobbies: true,
    maritalStatus: true,
    country: true,
    city: true,
  };
  setTouched(allTouched);

  const normalized = normalizeForValidation(values);
  const nextErrors = validateCompleteProfile(normalized);
  setErrors(nextErrors);
  if (Object.keys(nextErrors).length > 0) return;

  const payload = toBackendPayload(values);

  try {
    setIsSubmitting(true);

    // 1) save profile
    if (profileCompleted) {
      await profileApi.updateProfile(payload);
    } else {
      await profileApi.completeProfile(payload);
    }

    // 2) try refresh user (optional)
    try {
      await refreshMe();
    } catch (e) {
      console.warn("refreshMe failed", e);
    }

    // 3) navigate anyway
    onSuccess?.();
  } catch (err) {
    const msg =
      err?.response?.data?.message?.[0] ||
      err?.response?.data?.message ||
      err?.message ||
      "Помилка збереження профілю";
    setSubmitError(msg);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="complete-profile">
      <form className="complete-profile__form" onSubmit={handleSubmit}>
        <div className="cp-topbar">
          <button type="button" className="back-arrow" onClick={handleBack} aria-label="Назад">
            <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
          </button>

          <div className="cp-topbar__brand">ME YOU</div>

          <div className="cp-topbar__right">
            <ThemeToggleDark />
          </div>
        </div>

        <div className="cp-divider" />

        <div className="complete-profile__top-actions">
          <div className="cp-head">
            <div className="cp-head__title">Профіль</div>

            <div className="cp-avatar">
              <div className="cp-avatar__ring">
                {avatarPreview ? (
                  <img className="cp-avatar__img" src={avatarPreview} alt="avatar" />
                ) : (
                  <div className="cp-avatar__placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="54" height="54">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Zm0 2c-3.9 0-7 2.1-7 4.6V20h14v-1.4c0-2.5-3.1-4.6-7-4.6Z"
                      />
                    </svg>
                  </div>
                )}
                <span className="cp-avatar__dot" />
              </div>
            </div>

            <div className="cp-head__link">Додати фото профіля</div>
            <div className="cp-head__note">*профілі з фото отримають більше переглядів</div>

            <div className="cp-head__actions">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />

              <button type="button" className="cp-pill" onClick={handlePickAvatar}>
                Загрузить
              </button>

              <button type="button" className="cp-pill" disabled={!avatarFile} onClick={handleSaveAvatar}>
                Сохранить
              </button>
            </div>
          </div>
        </div>

        {/* LAST NAME */}
        <div className="field">
          <div className="field__wrap">
            {showStar("lastName") && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError("lastName") ? "is-error" : ""}`}
              placeholder="Прізвище"
              value={values.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              onBlur={() => onBlur("lastName")}
            />
          </div>
          {showError("lastName") && <div className="field__hint">{errors.lastName}</div>}
        </div>

        {/* FIRST NAME */}
        <div className="field">
          <div className="field__wrap">
            {showStar("firstName") && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError("firstName") ? "is-error" : ""}`}
              placeholder="Ім'я"
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              onBlur={() => onBlur("firstName")}
            />
          </div>
          {showError("firstName") && <div className="field__hint">{errors.firstName}</div>}
        </div>

        {/* PHONE */}
        <div className="field">
          <div className="field__wrap phone-wrap">
            {showStar("phone") && <span className="field__star">*</span>}
            <PhoneInput
              defaultCountry="ua"
              value={values.phone}
            
               onChange={(val) => setField("phone", normalizePhone(val))}
              onBlur={() => onBlur("phone")}
              inputClassName={`phone-input ${showError("phone") ? "is-error" : ""}`}
            />
          </div>
          {showError("phone") && <div className="field__hint">{errors.phone}</div>}
        </div>

        {/* NATIONALITY */}
        <div className="field">
          <div className="field__wrap">
            {showStar("nationality") && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError("nationality") ? "is-error" : ""}`}
              placeholder="Національність"
              value={values.nationality}
              onChange={(e) => setField("nationality", e.target.value)}
              onBlur={() => onBlur("nationality")}
            />
          </div>
          {showError("nationality") && <div className="field__hint">{errors.nationality}</div>}
        </div>

        {/* USERNAME */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError("username") ? "is-error" : ""}`}
              placeholder="Нік (необов'язково)"
              value={values.username}
              onChange={(e) => setField("username", e.target.value)}
              onBlur={() => onBlur("username")}
            />
          </div>
          {showError("username") && <div className="field__hint">{errors.username}</div>}
        </div>
{/* BIO */}
<div className="field">
  <div className="field__wrap">
    <textarea
      className={`text-area ${showError("bio") ? "is-error" : ""}`}
      placeholder="Про себе (необов'язково)"
      value={values.bio}
      onChange={(e) => setField("bio", e.target.value)}
      onBlur={() => onBlur("bio")}
      rows={3}
      maxLength={500}
    />
  </div>

  {/* ✅ підказка під полем */}
  <div className="field__meta">
    <span className="field__note">*максимум символів </span>
    <span className="field__counter">{(values.bio || "").length}/500</span>
  </div>

  {showError("bio") && <div className="field__hint">{errors.bio}</div>}
</div>

        {/* HOBBIES */}
        <div className="field">
          <div className="field__wrap select-wrap">
            {showStar("hobbies") && <span className="field__star">*</span>}
            <Select
              classNamePrefix="rs"
              placeholder="Хобі"
              isMulti
              value={values.hobbies}
              options={hobbyOptions}
              onChange={(arr) => setField("hobbies", arr || [])}
              onBlur={() => onBlur("hobbies")}
              {...selectCommonProps}
            />
          </div>
          {showError("hobbies") && <div className="field__hint">{errors.hobbies}</div>}
        </div>

        {/* MARITAL */}
        <div className="field">
          <div className="field__wrap select-wrap">
            {showStar("maritalStatus") && <span className="field__star">*</span>}
            <Select
              classNamePrefix="rs"
              placeholder="Сімейне положення"
              value={values.maritalStatus}
              options={maritalStatusOptions}
              onChange={(opt) => setField("maritalStatus", opt)}
              onBlur={() => onBlur("maritalStatus")}
              {...selectCommonProps}
            />
          </div>
          {showError("maritalStatus") && <div className="field__hint">{errors.maritalStatus}</div>}
        </div>

        {/* COUNTRY + CITY */}
        <div className="grid-2">
          <div className="field">
            <div className="field__wrap select-wrap">
              {showStar("country") && <span className="field__star">*</span>}
              <Select
                classNamePrefix="rs"
                placeholder="Країна"
                value={values.country}
                options={countryOptions}
                onChange={(opt) => setField("country", opt)}
                onBlur={() => onBlur("country")}
                {...selectCommonProps}
              />
            </div>
            {showError("country") && <div className="field__hint">{errors.country}</div>}
          </div>

          <div className="field">
            <div className="field__wrap select-wrap">
              {showStar("city") && <span className="field__star">*</span>}
              <Select
                classNamePrefix="rs"
                placeholder="Місто"
                value={values.city}
                options={cityOptions}
                isDisabled={!values.country}
                isLoading={isCitiesLoading}
                onChange={(opt) => setField("city", opt)}
                onBlur={() => onBlur("city")}
                {...selectCommonProps}
              />
            </div>
            {showError("city") && <div className="field__hint">{errors.city}</div>}
          </div>
        </div>

        {submitError && <div className="auth__error">{submitError}</div>}

        <button className="btn-gradient wide" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? "Збереження..." : "Зберегти"}
        </button>
      </form>
    </div>
  );
}
function normalizeForValidation(v) {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone), // ✅
    nationality: v.nationality,
    username: v.username,
    bio: v.bio,
    hobbies: Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [],
    maritalStatus: v.maritalStatus?.value || "",
    country: v.country?.value || "",
    city: v.city?.value || "",
  };
}
function toBackendPayload(v) {
  const payload = {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    phone: normalizePhone(v.phone),
    nationality: v.nationality.trim(),
    country: v.country?.value || "",
    city: v.city?.value || "",
    maritalStatus: v.maritalStatus?.value || undefined,
    bio: v.bio?.trim() || undefined,
  };

  const username = v.username?.trim();
  if (username) payload.username = username;

  const hobbies = Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [];
  if (hobbies.length) payload.hobbies = hobbies;

  return payload;
}

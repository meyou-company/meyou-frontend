import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { profileApi } from "../../../../services/profileApi";
import { locationApi } from "../../../../services/locationApi";

import {
  hobbyOptions,
  maritalStatusOptions,
} from "../../../../utils/profileOptions";
import { validateCompleteProfile } from "../../../../utils/validationCompleteProfile";

import "./CompleteProfileForm.scss";
import ThemeToggleDark from "../../../../components/ThemeToggleDark/ThemeToggleDark";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  nationality: "",
  username: "",
  bio: "",
  hobbies: [],
  maritalStatus: null, // option
  country: null, // option
  city: null, // option
};

export default function CompleteProfileForm({onBack}) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [countryOptions, setCountryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);

  // avatar (preview + file)
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // ✅ react-select portal (щоб меню НЕ обрізалось)
  const selectPortalTarget =
    typeof window !== "undefined" ? document.body : null;

  const selectCommonProps = useMemo(() => {
    if (!selectPortalTarget) return {};
    return {
      menuPortalTarget: selectPortalTarget,
      menuPosition: "fixed",
      styles: {
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      },
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

  // prefill from backend if exists
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const p = await profileApi.getProfile();
        if (!alive || !p) return;

        // hobbies: ["Спорт"...]
        const hobbiesSelected = Array.isArray(p.hobbies)
          ? hobbyOptions.filter((o) => p.hobbies.includes(o.value))
          : [];

        const maritalSelected =
          maritalStatusOptions.find((o) => o.value === p.maritalStatus) || null;

        const countrySelected = p.country
          ? { value: p.country, label: p.country }
          : null;

        const citySelected = p.city ? { value: p.city, label: p.city } : null;

        setValues((prev) => ({
          ...prev,
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          phone: p.phone || "",
          nationality: p.nationality || "",
          username: p.username || "",
          bio: p.bio || "",
          hobbies: hobbiesSelected,
          maritalStatus: maritalSelected,
          country: countrySelected,
          city: citySelected,
        }));

        // якщо є країна — підвантажимо міста і поставимо список
        if (p.country) {
          setIsCitiesLoading(true);
          const cities = await locationApi.getCitiesByCountry(p.country);
          if (!alive) return;
          setCityOptions(cities);
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

        // якщо місто вже було і є в опціях — залишимо
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
  };

  const showError = (key) => Boolean(touched[key] && errors[key]);

  // ⭐ показуємо, якщо required і (порожньо або є помилка після взаємодії)
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

    // preview
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;

    try {
      // ✅ якщо у тебе є ендпоінт на бекенді - розкоментуй та зроби метод:
      // const fd = new FormData();
      // fd.append("file", avatarFile);
      // await profileApi.uploadAvatar(fd);

      // Поки бекенду немає — просто показуємо preview
      console.log("avatar ready:", avatarFile);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      await profileApi.completeProfile(payload);
      // тут можеш router.push("/profile") або куди треба
    } catch (err) {
      console.error(err);
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
  {/* LEFT — BACK */}
  <button
    type="button"
    className="back-arrow"
    onClick={handleBack}
    aria-label="Назад"
  >
    <img
      src="/icon1/Vector.png"
      alt=""
      aria-hidden="true"
      className="back-arrow__icon"
    />
  </button>

  {/* CENTER — LOGO */}
  <div className="cp-topbar__brand">ME YOU</div>

  {/* RIGHT — DARK MODE */}
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
                  <img
                    className="cp-avatar__img"
                    src={avatarPreview}
                    alt="avatar"
                  />
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
            <div className="cp-head__note">
              *профілі з фото отримають більше переглядів
            </div>

            <div className="cp-head__actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />

              <button type="button" className="cp-pill" onClick={handlePickAvatar}>
                Загрузить
              </button>

              <button
                type="button"
                className="cp-pill"
                disabled={!avatarFile}
                onClick={handleSaveAvatar}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>

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
          {showError("lastName") && (
            <div className="field__hint">{errors.lastName}</div>
          )}
        </div>

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
          {showError("firstName") && (
            <div className="field__hint">{errors.firstName}</div>
          )}
        </div>

        {/* PHONE */}
    
        <div className="field">
          <div className="field__wrap phone-wrap">
            {showStar("phone") && <span className="field__star">*</span>}
            <PhoneInput
  defaultCountry="ua"
  value={values.phone}
  onChange={(val) => setField("phone", val)}
  onBlur={() => onBlur("phone")}
  inputClassName={`phone-input ${showError("phone") ? "is-error" : ""}`}
/>


          </div>
          {showError("phone") && <div className="field__hint">{errors.phone}</div>}
        </div>

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
          {showError("nationality") && (
            <div className="field__hint">{errors.nationality}</div>
          )}
        </div>

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
          {showError("username") && (
            <div className="field__hint">{errors.username}</div>
          )}
        </div>

        <div className="field">
          <div className="field__wrap">
            <textarea
              className={`text-area ${showError("bio") ? "is-error" : ""}`}
              placeholder="Про себе (необов'язково)"
              value={values.bio}
              onChange={(e) => setField("bio", e.target.value)}
              onBlur={() => onBlur("bio")}
              rows={3}
            />
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
          {showError("maritalStatus") && (
            <div className="field__hint">{errors.maritalStatus}</div>
          )}
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
            {showError("country") && (
              <div className="field__hint">{errors.country}</div>
            )}
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
    phone: v.phone,
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
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    phone: v.phone,
    nationality: v.nationality.trim(),
    country: v.country?.value || "",
    city: v.city?.value || "",
    maritalStatus: v.maritalStatus?.value || "",
    username: v.username ? v.username.trim() : "",
    bio: v.bio ? v.bio.trim() : "",
    hobbies: Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [],
  };
}

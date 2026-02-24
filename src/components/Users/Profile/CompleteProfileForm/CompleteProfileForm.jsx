import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import ThemeToggleDark from "../../../../components/ThemeToggleDark/ThemeToggleDark";
import { useAuthStore } from "../../../../zustand/useAuthStore";

import { profileApi } from "../../../../services/profileApi";
import { locationApi } from "../../../../services/locationApi";

import {  maritalStatusOptions } from "../../../../utils/profileOptions";
import { validateCompleteProfile } from "../../../../utils/validationCompleteProfile";
import { interestOptions } from "../../../../constants/interests";
import { profileHobbyOptions } from "../../../../constants/hobbies";
import { useLocationOptions } from "../../../../hooks/useLocationOptions";
import { usePrefillProfile } from "../../../../hooks/usePrefillProfile";

import { normalizeForValidation, toBackendPayload } from "../../../../utils/profilePayload";
import { normalizePhone } from "../../../../utils/normalizePhone";

import AvatarCropModal from "../../../../components/AvatarCropModal/AvatarCropModal";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { authApi } from "../../../../services/auth";

import "./CompleteProfileForm.scss";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  nationality: "",
  username: "",
  bio: "",
  interests: [],
  hobbies: [],
  maritalStatus: null,
  country: null,
  city: null,
  gender: null,
  birthDate: "", // "YYYY-MM-DD"
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "Мужской" },
  { value: "FEMALE", label: "Женский" },
];

const MAX_INTERESTS = 7;
const MAX_HOBBIES = 7;

/** Мін/макс дата для віку 18–100 років */
function getBirthDateLimits() {
  const today = new Date();
  const max = new Date(today);
  max.setFullYear(max.getFullYear() - 18);
  const min = new Date(today.getFullYear() - 100, 0, 1);
  return {
    minStr: min.toISOString().slice(0, 10),
    maxStr: max.toISOString().slice(0, 10),
    minDate: min,
    maxDate: max,
  };
}

export default function CompleteProfileForm({ onBack, onSuccess }) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  // ===== AUTH / USER =====
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const backendAvatarUrl = user?.avatarUrl || "";

  // ===== AVATAR CROP STATE =====
  const [cropSrc, setCropSrc] = useState("");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // file input ref
  const fileRef = useMemo(() => ({ current: null }), []);
  const genderDropdownRef = useRef(null);
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);
 
  const pickAvatar = () => {
    setAvatarError("");
    fileRef.current?.click?.();
  };

  const handlePickForCrop = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!okTypes.includes(file.type)) {
      setAvatarError("Дозволено лише JPEG / PNG / WebP");
      return;
    }

    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setIsCropOpen(true);
  };

  const closeCrop = () => {
    setIsCropOpen(false);
    setCropSrc("");
    setAvatarError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleCropConfirm = async (croppedPixels) => {
    try {
      setIsAvatarUploading(true);
      setAvatarError("");

      const file = await cropImageToFile(cropSrc, croppedPixels, "avatar.jpg");

      await authApi.uploadAvatar(file);

      await refreshMe();
      closeCrop();
      toast.success("Аватар оновлено");
    } catch (err) {
      const raw = err?.response?.data?.message;
      const msg =
        err?.response?.status === 401
          ? "Сесія закінчилась. Увійди знову."
          : (Array.isArray(raw) ? raw[0] : raw) ||
            err?.message ||
            "Не вдалося зберегти фото";
      toast.error(String(msg));
      setAvatarError(String(msg));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setIsAvatarUploading(true);
      setAvatarError("");
      await authApi.deleteAvatar();
      await refreshMe();
      toast.success("Аватар видалено");
    } catch (err) {
      const raw = err?.response?.data?.message;
      const msg =
        err?.response?.status === 401
          ? "Сесія закінчилась. Увійди знову."
          : (Array.isArray(raw) ? raw[0] : raw) ||
            err?.message ||
            "Помилка видалення аватару";
      toast.error(String(msg));
      setAvatarError(String(msg));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // ===== react-select portal =====
  const selectPortalTarget = typeof window !== "undefined" ? document.body : null;
  const selectCommonProps = useMemo(() => {
    if (!selectPortalTarget) return {};
    return {
      menuPortalTarget: selectPortalTarget,
      menuPosition: "fixed",
      styles: { menuPortal: (base) => ({ ...base, zIndex: 9999999 }) },
    };
  }, [selectPortalTarget]);

  // ===== locations =====
  const [cityOptions, setCityOptions] = useState([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);

  const {
    countryOptions,
    cityOptions: citiesFromHook,
    isCitiesLoading: citiesLoadingHook,
  } = useLocationOptions(values.country?.value, values.city?.value, setValues);

  useEffect(() => {
    setCityOptions(citiesFromHook);
    setIsCitiesLoading(citiesLoadingHook);
  }, [citiesFromHook, citiesLoadingHook]);

  // ===== prefill =====
  usePrefillProfile({
    setProfileCompleted,
    setValues,
    interestOptions,
    hobbyOptions: profileHobbyOptions,
    maritalStatusOptions,
    setCityOptions,
    setIsCitiesLoading,
    locationApi,
    profileApi,
  });

  // ===== validate =====
  useEffect(() => {
    const normalized = normalizeForValidation(values);
    setErrors(validateCompleteProfile(normalized));
  }, [values]);

  useEffect(() => {
    if (!genderPickerOpen) return;
    const handleOutside = (e) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(e.target)) {
        setGenderPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [genderPickerOpen]);

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
      "username",
      "interests",
      "hobbies",
      "maritalStatus",
      "country",
      "city",
      "birthDate",
      "gender",
    ];
    if (!requiredKeys.includes(key)) return false;

    const v = values[key];
    const isEmpty =
      v === null ||
      v === undefined ||
      (typeof v === "string" && !v.trim()) ||
      (Array.isArray(v) && v.length === 0);

    if (isEmpty) return true;
    if (key === "gender") {
      if (values.gender !== "MALE" && values.gender !== "FEMALE") return true;
    }
    if (touched[key] && errors[key]) return true;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      nationality: true,
      username: true,
      bio: true,
      interests: true,
      hobbies: true,
      maritalStatus: true,
      country: true,
      city: true,
      gender: true,
      birthDate: true,
    });

    const normalized = normalizeForValidation(values);
    const nextErrors = validateCompleteProfile(normalized);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = toBackendPayload(values);
    console.log("PAYLOAD >>>", payload);

    try {
      setIsSubmitting(true);

      const status = await profileApi.getProfileStatus();
      const isCompleted = Boolean(status?.profileCompleted);

      if (isCompleted) await profileApi.updateProfile(payload);
      else await profileApi.completeProfile(payload);

      setProfileCompleted(true);

      await refreshMe();
      toast.success("Профіль збережено");
      onSuccess?.();
    } catch (err) {
      console.log("ERR STATUS", err?.response?.status);
      console.log("ERR DATA", err?.response?.data);
      console.log("ERR RAW", err);
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Помилка збереження профілю";
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };
const toYMDLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

  const currentAvatarSrc = backendAvatarUrl;

  return (
    <div className="complete-profile">
      <form className="complete-profile__form" onSubmit={handleSubmit}>
        <div className="cp-topbar">
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

          <div className="cp-topbar__brand">ME YOU</div>

          <div className="cp-topbar__right">
            <ThemeToggleDark />
          </div>
        </div>

        <div className="cp-divider" />

        {/* HEADER */}
        <div className="cp-head">
          <div className="cp-head__title">Профіль</div>

          <div className="cp-avatar">
            <div className="cp-avatar__ring" onClick={pickAvatar} role="button" tabIndex={0}>
              {currentAvatarSrc ? (
                <img className="cp-avatar__img" src={currentAvatarSrc} alt="avatar" />
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
              onChange={handlePickForCrop}
            />

            <button type="button" className="cp-pill" onClick={pickAvatar}>
              Загрузить
            </button>

            <button
              type="button"
              className="cp-pill danger"
              onClick={deleteAvatar}
              disabled={isAvatarUploading}
            >
              {isAvatarUploading ? "..." : "Удалить"}
            </button>
          </div>

          {avatarError && <div className="auth__error">{avatarError}</div>}
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
          {showError("lastName") && (
            <div className="field__hint">{errors.lastName}</div>
          )}
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
          {showError("firstName") && (
            <div className="field__hint">{errors.firstName}</div>
          )}
        </div>

        {/* ПОЛ + ВОЗРАСТ: десктоп/планшет — як на фото; мобілка — один ряд, по тапу вискакує вибір */}
        <div className="grid-2 grid-2--gender-age">
          <div className={`field field--gender ${genderPickerOpen ? "field--genderOpen" : ""}`} ref={genderDropdownRef}>
            {/* Десктоп/планшет: текст "Пол" навпроти опцій (один ряд) */}
            <div className="field__genderWrap field__genderWrap--desktop">
              <label className="field__label field__label--row">
                {showStar("gender") && <span className="field__star">*</span>}

                Пол
              </label>
              <div className="field__genderGroup">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`field__genderBtn ${values.gender === opt.value ? "field__genderBtnActive" : ""}`}
                    onClick={() => setField("gender", opt.value)}
                    onBlur={() => onBlur("gender")}
                  >
                    <span className="field__genderLabel">{opt.label}</span>
                    <span className="field__genderToggle" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            {/* Мобілка: один ряд, по натисканню — вибір поверх полів */}
            <div className="field__genderWrap field__genderWrap--mobile">
              <div className="field__genderTriggerWrap">
                <button
                  type="button"
                  className="field__genderTrigger"
                onClick={() => setGenderPickerOpen((o) => !o)}
                aria-expanded={genderPickerOpen}
                aria-haspopup="listbox"
              >
                  {showStar("gender") && <span className="field__star">*</span>}
           
                <span className="field__genderTriggerText">
                  <span className={`field__genderTriggerValue ${!values.gender ? "field__genderTriggerValue--placeholder" : ""}`}>
                    {GENDER_OPTIONS.find((o) => o.value === values.gender)?.label ?? "Виберіть"}
                  </span>
                  <span className="field__genderTriggerLabel">Пол</span>
                </span>
                <span className="field__genderChevron" aria-hidden="true" />
              </button>
              </div>
              {genderPickerOpen && (
                <div className="field__genderDropdown" role="listbox">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      role="option"
                      aria-selected={values.gender === opt.value}
                      className={`field__genderDropdownItem ${values.gender === opt.value ? "field__genderDropdownItemActive" : ""}`}
                      onClick={() => {
                        setField("gender", opt.value);
                        onBlur("gender");
                        setGenderPickerOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showError("gender") && <div className="field__hint">{errors.gender}</div>}
          </div>

          <div className="field">
            <div className="field__wrap field__wrap--birthDate">
              {showStar("birthDate") && <span className="field__star">*</span>}
              <DatePicker
                className={`text-input field__date-input ${showError("birthDate") ? "is-error" : ""}`}
                placeholderText="Оберіть дату народження"
                aria-label="Дата народження"
                dateFormat="yyyy-MM-dd"
                selected={values.birthDate ? new Date(values.birthDate + "T12:00:00") : null}
                minDate={getBirthDateLimits().minDate}
                maxDate={getBirthDateLimits().maxDate}
                onChange={(d) => setField("birthDate", d ? toYMDLocal(d) : "")}
                onBlur={() => onBlur("birthDate")}
                popperClassName="birthDate-picker"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
              />
              <span className="field__date-indicator" aria-hidden="true" />
            </div>
            {showError("birthDate") && <div className="field__hint">{errors.birthDate}</div>}
          </div>
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
          {showError("phone") && (
            <div className="field__hint">{errors.phone}</div>
          )}
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
            {showStar("username") && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError("username") ? "is-error" : ""}`}
              placeholder="Нік"
              value={values.username}
              onChange={(e) => setField("username", e.target.value)}
              onBlur={() => onBlur("username")}
              required
              aria-required="true"
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

        {/* INTERESTS (interests String[] на бекенді, макс. 7) */}
        <div className="field">
          <div className="field__wrap select-wrap">
            {showStar("interests") && <span className="field__star">*</span>}
            <Select
              classNamePrefix="rs"
              placeholder="Інтереси"
              isMulti
              value={values.interests}
              options={interestOptions}
              onChange={(arr) => setField("interests", (arr || []).slice(0, MAX_INTERESTS))}
              onBlur={() => onBlur("interests")}
              isOptionDisabled={() => (values.interests || []).length >= MAX_INTERESTS}
              {...selectCommonProps}
            />
          </div>
          <div className="field__meta">
            <span className="field__note">Максимум {MAX_INTERESTS}</span>
            <span className="field__counter">{(values.interests || []).length}/{MAX_INTERESTS}</span>
          </div>
          {showError("interests") && <div className="field__hint">{errors.interests}</div>}
        </div>

        {/* HOBBIES (макс. 7) */}
        <div className="field">
          <div className="field__wrap select-wrap">
            {showStar("hobbies") && <span className="field__star">*</span>}
            <Select
              classNamePrefix="rs"
              placeholder="Хобі"
              isMulti
              value={values.hobbies}
              options={profileHobbyOptions}
              onChange={(arr) => setField("hobbies", (arr || []).slice(0, MAX_HOBBIES))}
              onBlur={() => onBlur("hobbies")}
              isOptionDisabled={() => (values.hobbies || []).length >= MAX_HOBBIES}
              {...selectCommonProps}
            />
          </div>
          <div className="field__meta">
            <span className="field__note">Максимум {MAX_HOBBIES}</span>
            <span className="field__counter">{(values.hobbies || []).length}/{MAX_HOBBIES}</span>
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
          {isSubmitting ? "Збереження..." : profileCompleted ? "Оновити" : "Зберегти"}
        </button>
      </form>

      {/* CROP MODAL */}
      {isCropOpen && (
        <AvatarCropModal
          src={cropSrc}
          onClose={closeCrop}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

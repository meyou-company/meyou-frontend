import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

import { useAuthStore } from '../../../../zustand/useAuthStore';

import { authApi } from '../../../../services/auth';
import { profileApi } from '../../../../services/profileApi';
import { locationApi } from '../../../../services/locationApi';
import { usersApi } from '../../../../services/usersApi';

import { useLocationOptions } from '../../../../hooks/useLocationOptions';
import { usePrefillProfile } from '../../../../hooks/usePrefillProfile';

import { normalizeForValidation, toBackendPayload } from '../../../../utils/profilePayload';

import { maritalStatusOptions } from '../../../../utils/profileOptions';
import { validateCompleteProfile } from '../../../../utils/validationCompleteProfile';
import { normalizePhone } from '../../../../utils/normalizePhone';
import { cropImageToFile } from '../../../../utils/cropImageToFile';

import { interestOptions } from '../../../../constants/interests';
import { profileHobbyOptions } from '../../../../constants/hobbies';
import profileIcons from '../../../../constants/profileIcons';

import ThemeToggleDark from '../../../../components/ThemeToggleDark/ThemeToggleDark';
import AvatarCropModal from '../../../../components/AvatarCropModal/AvatarCropModal';
import MultiSelect from './MultiSelect';

import './EditProfileForm.scss';

const INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  phone: '',
  nationality: '',
  username: '',
  bio: '',
  interests: [],
  hobbies: [],
  maritalStatus: null,
  country: null,
  city: null,
  gender: null,
  birthDate: '',
};

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Чоловіча' },
  { value: 'FEMALE', label: 'Жіноча' },
];

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

export default function EditProfileForm({ onBack, onSave }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== AUTH / USER =====
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const backendAvatarUrl = user?.avatarUrl || '';

  // ===== AVATAR CROP STATE =====
  const [cropSrc, setCropSrc] = useState('');
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const fileRef = useMemo(() => ({ current: null }), []);
  const genderDropdownRef = useRef(null);
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);

  const pickAvatar = () => {
    setAvatarError('');
    fileRef.current?.click?.();
  };

  const handlePickForCrop = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!okTypes.includes(file.type)) {
      setAvatarError('Дозволено лише JPEG, PNG, WebP');
      return;
    }

    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setIsCropOpen(true);
  };

  const closeCrop = () => {
    setIsCropOpen(false);
    setCropSrc('');
    setAvatarError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropConfirm = async (croppedPixels) => {
    try {
      setIsAvatarUploading(true);
      setAvatarError('');

      const file = await cropImageToFile(cropSrc, croppedPixels, 'avatar.jpg');

      await authApi.uploadAvatar(file);

      await refreshMe();
      closeCrop();
      toast.success('Аватар оновлено');
    } catch (err) {
      const raw = err?.response?.data?.message;
      const msg =
        err?.response?.status === 401
          ? 'Сесія закінчилась. Увійди знову.'
          : (Array.isArray(raw) ? raw[0] : raw) || err?.message || 'Не вдалося оновити фото';
      toast.error(String(msg));
      setAvatarError(String(msg));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setIsAvatarUploading(true);
      setAvatarError('');
      await authApi.deleteAvatar();
      await refreshMe();
      toast.success('Аватар видалено');
    } catch (err) {
      const raw = err?.response?.data?.message;
      const msg =
        err?.response?.status === 401
          ? 'Сесія закінчилась. Увійди знову.'
          : (Array.isArray(raw) ? raw[0] : raw) || err?.message || 'Помилка видалення аватару';
      toast.error(String(msg));
      setAvatarError(String(msg));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // ===== REACT-SELECT PORTAL =====
  const selectPortalTarget = typeof window !== 'undefined' ? document.body : null;

  const selectCommonProps = useMemo(() => {
    if (!selectPortalTarget) return {};
    return {
      menuPortalTarget: selectPortalTarget,
      menuPosition: 'fixed',
      styles: { menuPortal: (base) => ({ ...base, zIndex: 9999999 }) },
    };
  }, [selectPortalTarget]);

  // ===== LOCATIONS =====
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

  // ===== PREFILL FROM USER ====
  usePrefillProfile({
    setProfileCompleted: () => {},
    setValues,
    interestOptions,
    hobbyOptions: profileHobbyOptions,
    maritalStatusOptions,
    setCityOptions,
    setIsCitiesLoading,
    locationApi,
    profileApi,
  });

  // ===== VALIDATION =====
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
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [genderPickerOpen]);

  const onBlur = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const setField = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setSubmitError('');
  };

  const showError = (key) => Boolean(touched[key] && errors[key]);

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

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

    const username = normalized.username?.trim();
    if (username) {
      try {
        const res = await usersApi.getByUsername(username);
        const data = res?.data ?? res;
        const currentUserId = user?.id;
        if (data?.id && data.id !== currentUserId) {
          setErrors((prev) => ({ ...prev, username: 'Цей нік вже зайнятий' }));
          return;
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          setSubmitError(err?.message || 'Помилка перевірки ніка');
          return;
        }
      }
    }

    const payload = toBackendPayload(values);
    console.log('PAYLOAD', payload);
    try {
      setIsSubmitting(true);
      await onSave?.(payload);
    } catch (err) {
      console.log('ERR RAW', err);
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        'Помилка оновлення профілю';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toYMDLocal = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const currentAvatarSrc = backendAvatarUrl;

  return (
    <div className="edit-profile">
      <form className="edit-profile__form" onSubmit={handleSubmit}>
        <div className="ep-topbar">
          <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
            <img
              src={profileIcons.arrowGradient}
              alt=""
              aria-hidden="true"
              className="back-arrow__icon"
            />
          </button>

          <div className="ep-topbar__brand">ME YOU</div>

          <div className="ep-topbar__right">
            <ThemeToggleDark />
          </div>
        </div>
        <div className="ep-divider" />
        {/* HEADER */}
        <div className="ep-head">
          <div className="ep-head__title">Редагувати профіль</div>

          <div className="ep-avatar">
            <div className="ep-avatar__ring" onClick={pickAvatar} role="button" tabIndex={0}>
              {currentAvatarSrc ? (
                <img className="ep-avatar__img" src={currentAvatarSrc} alt="avatar" />
              ) : (
                <div className="ep-avatar__placeholder" aria-hidden="true">
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
              <span className="ep-avatar__dot" />
            </div>
          </div>

          <div className="ep-head__link">Змінити фото профілю</div>

          <div className="ep-head__actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePickForCrop} />

            <button type="button" className="ep-pill" onClick={pickAvatar}>
              Завантажити
            </button>

            {backendAvatarUrl && (
              <button
                type="button"
                className="ep-pill danger"
                onClick={deleteAvatar}
                disabled={isAvatarUploading}
              >
                {isAvatarUploading ? '...' : 'Видалити'}
              </button>
            )}
          </div>

          {avatarError && <div className="field__hint">{avatarError}</div>}
        </div>
        {/* LAST NAME */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError('lastName') ? 'is-error' : ''}`}
              placeholder="Прізвище"
              value={values.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              onBlur={() => onBlur('lastName')}
            />
          </div>
          {showError('lastName') && <div className="field__hint">{errors.lastName}</div>}
        </div>
        {/* NAME */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError('firstName') ? 'is-error' : ''}`}
              placeholder="Ім'я"
              value={values.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              onBlur={() => onBlur('firstName')}
            />
          </div>
          {showError('firstName') && <div className="field__hint">{errors.firstName}</div>}
        </div>
        {/* СТАТЬ + ВІК: десктоп/планшет — 2 поля в одному рядку; мобілка — кожне поле - свій рядок */}
        <div className="grid-2">
          <div
            className={`field field--gender ${genderPickerOpen ? 'field--genderOpen' : ''}`}
            ref={genderDropdownRef}
          >
            {/* Десктоп/планшет: текст "СТАТЬ" навпроти опцій (один ряд) */}
            <div className="field__genderWrap field__genderWrap--desktop">
              <label className="field__label field__label--row">Стать</label>
              <div className="field__genderGroup">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`field__genderBtn ${
                      values.gender === opt.value ? 'field__genderBtnActive' : ''
                    }`}
                    onClick={() => setField('gender', opt.value)}
                    onBlur={() => onBlur('gender')}
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
                  <span className="field__genderTriggerText">
                    <span
                      className={`field__genderTriggerValue ${
                        !values.gender ? 'field__genderTriggerValue--placeholder' : ''
                      }`}
                    >
                      {GENDER_OPTIONS.find((o) => o.value === values.gender)?.label ?? 'Виберіть'}
                    </span>
                    <span className="field__genderTriggerLabel">Стать</span>
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
                      className={`field__genderDropdownItem ${
                        values.gender === opt.value ? 'field__genderDropdownItemActive' : ''
                      }`}
                      onClick={() => {
                        setField('gender', opt.value);
                        onBlur('gender');
                        setGenderPickerOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showError('gender') && <div className="field__hint">{errors.gender}</div>}
          </div>

          <div className="field">
            <div className="field__wrap field__wrap--birthDate">
              <DatePicker
                className={`text-input field__date-input ${
                  showError('birthDate') ? 'is-error' : ''
                }`}
                placeholderText="Оберіть дату народження"
                aria-label="Дата народження"
                dateFormat="yyyy-MM-dd"
                selected={
                  values?.birthDate && !isNaN(new Date(values.birthDate).getTime())
                    ? new Date(values.birthDate)
                    : null
                }
                minDate={getBirthDateLimits().minDate}
                maxDate={getBirthDateLimits().maxDate}
                onChange={(d) => setField('birthDate', d ? toYMDLocal(d) : '')}
                onBlur={() => onBlur('birthDate')}
                popperClassName="birthDate-picker"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
              />
              <span className="field__date-indicator" aria-hidden="true" />
            </div>
            {showError('birthDate') && <div className="field__hint">{errors.birthDate}</div>}
          </div>
        </div>
        {/* PHONE */}
        <div className="field">
          <div className="field__wrap phone-wrap">
            <PhoneInput
              defaultCountry="ua"
              value={values.phone}
              onChange={(val) => setField('phone', normalizePhone(val))}
              onBlur={() => onBlur('phone')}
              inputClassName={`phone-input ${showError('phone') ? 'is-error' : ''}`}
            />
          </div>
          {showError('phone') && <div className="field__hint">{errors.phone}</div>}
        </div>
        {/* NATIONALITY */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError('nationality') ? 'is-error' : ''}`}
              placeholder="Національність"
              value={values.nationality}
              onChange={(e) => setField('nationality', e.target.value)}
              onBlur={() => onBlur('nationality')}
              // style={{ paddingRight: '40px' }}
            />
            <img
              src={profileIcons.lockBlack}
              alt="Locked"
              aria-hidden="true"
              className="field__lock-icon"
            />
          </div>
          {showError('nationality') && <div className="field__hint">{errors.nationality}</div>}
        </div>
        {/* NICKNAME */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError('username') ? 'is-error' : ''}`}
              placeholder="Нік (до 10 символів)"
              value={values.username}
              onChange={(e) => setField('username', e.target.value)}
              onBlur={() => onBlur('username')}
              maxLength={10}
              required
              aria-required="true"
            />
          </div>
          {showError('username') && <div className="field__hint">{errors.username}</div>}
        </div>
        {/* BIO */}
        <div className="field">
          <div className="field__wrap">
            <textarea
              className={`text-area ${showError('bio') ? 'is-error' : ''}`}
              placeholder="Про себе (необов'язково)"
              value={values.bio}
              onChange={(e) => setField('bio', e.target.value)}
              onBlur={() => onBlur('bio')}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="field__meta">
            <span className="field__note">*максимум символів </span>
            <span className="field__counter">{(values.bio || '').length}/500</span>
          </div>

          {showError('bio') && <div className="field__hint">{errors.bio}</div>}
        </div>
        {/* INTERESTS */}
        <MultiSelect
          value={values.interests}
          onChange={(val) => setField('interests', val)}
          options={interestOptions}
          placeholder="Інтереси"
          onBlur={() => onBlur('interests')}
          error={showError('interests') && errors.interests}
          selectProps={selectCommonProps}
        />
        {/* HOBBIES */}
        <MultiSelect
          value={values.hobbies}
          onChange={(val) => setField('hobbies', val)}
          options={profileHobbyOptions}
          placeholder="Хобі"
          onBlur={() => onBlur('hobbies')}
          error={showError('hobbies') && errors.hobbies}
          selectProps={selectCommonProps}
        />
        {/* MARITAL */}
        <div className="field">
          <div className="field__wrap select-wrap">
            <Select
              classNamePrefix="rs"
              placeholder="Сімейний стан"
              value={values.maritalStatus}
              options={maritalStatusOptions}
              onChange={(opt) => setField('maritalStatus', opt)}
              onBlur={() => onBlur('maritalStatus')}
              {...selectCommonProps}
            />
          </div>

          {showError('maritalStatus') && <div className="field__hint">{errors.maritalStatus}</div>}
        </div>
        {/* COUNTRY + CITY */}
        <div className="grid-2">
          <div className="field">
            <div className="field__wrap select-wrap">
              <Select
                classNamePrefix="rs"
                placeholder="Країна"
                value={values.country}
                options={countryOptions}
                onChange={(opt) => setField('country', opt)}
                onBlur={() => onBlur('country')}
                {...selectCommonProps}
              />
            </div>
            {showError('country') && <div className="field__hint">{errors.country}</div>}
          </div>

          <div className="field">
            <div className="field__wrap select-wrap">
              <Select
                classNamePrefix="rs"
                placeholder="Місто"
                value={values.city}
                options={cityOptions}
                isDisabled={!values.country}
                isLoading={isCitiesLoading}
                onChange={(opt) => setField('city', opt)}
                onBlur={() => onBlur('city')}
                {...selectCommonProps}
              />
            </div>
            {showError('city') && <div className="field__hint">{errors.city}</div>}
          </div>
        </div>
        {submitError && <div className="field__hint">{submitError}</div>}
        <button className="btn-gradient wide" disabled={isSubmitting}>
          {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
        </button>
      </form>

      {/* CROP MODAL */}
      {isCropOpen && (
        <AvatarCropModal src={cropSrc} onClose={closeCrop} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}

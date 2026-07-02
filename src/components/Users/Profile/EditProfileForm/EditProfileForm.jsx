import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import Select from 'react-select';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

import { useAuthStore } from '../../../../zustand/useAuthStore';

import { authApi } from '../../../../services/auth';
import { profileApi } from '../../../../services/profileApi';
import { locationApi } from '../../../../services/locationApi';
import { usersApi } from '../../../../services/usersApi';

import { useLocationOptions } from '../../../../hooks/useLocationOptions';
import { useProfileSelectProps } from '../../../../hooks/useProfileSelectProps';
import { usePrefillProfile } from '../../../../hooks/usePrefillProfile';
import { useGenderOptions, useMaritalStatusOptions } from '../../../../hooks/useProfileFormOptions';

import { normalizeForValidation, toEditProfilePayload } from '../../../../utils/profilePayload';
import { cropImageToFile } from '../../../../utils/cropImageToFile';
import {
  validateEditProfile,
  translateValidationErrors,
} from '../../../../utils/validationProfile';
import { getApiErrorCode, getApiErrorMessage } from '../../../../utils/getApiErrorMessage';
import { applyBirthDateNormalization } from '../../../../utils/profileFormUtils';

import { interestOptions } from '../../../../constants/interests';
import { profileHobbyOptions } from '../../../../constants/hobbies';
import profileIcons from '../../../../constants/profileIcons';

import ThemeToggleDark from '../../../../components/ThemeToggleDark/ThemeToggleDark';
import AvatarCropModal from '../../../../components/AvatarCropModal/AvatarCropModal';
import BirthDateField from '../BirthDateField/BirthDateField';
import MultiSelect from './MultiSelect';
import VisibilityToggle from './VisibilityToggle';

import './EditProfileForm.scss';

const INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  username: '',
  gender: null,
  birthDate: '',
  phone: '',

  nationality: '',
  maritalStatus: null,
  bio: '',
  about: '',

  interests: [],
  hobbies: [],
  profession: '',
  languages: [],
  languagesInput: '',

  country: null,
  region: null,
  city: null,

  instagram: '',
  tiktok: '',
  telegram: '',

  profileVisibility: {
    about: false,
    interests: false,
    hobbies: false,
    languages: false,
    profession: false,
    maritalStatus: false,
    nationality: false,
    location: false,
    instagram: false,
    telegram: false,
    tiktok: false,
  },
};

export default function EditProfileForm({ onBack, onSave }) {
  // I18N / OPTIONS
  const { t } = useTranslation();

  const genderOptions = useGenderOptions();
  const maritalStatusOptions = useMaritalStatusOptions();

  // FORM STATE
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AUTH / USER
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const backendAvatarUrl = user?.avatarUrl || '';

  // AVATAR STATE
  const [cropSrc, setCropSrc] = useState('');
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // REFS
  const fileRef = useRef(null);
  const genderDropdownRef = useRef(null);

  // UI STATE
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);

  // CUSTOM HOOKS
  const { countryOptions, regionOptions, cityOptions, cityInputMode, isRegionsLoading, isCitiesLoading } =
    useLocationOptions(values.country?.value || '', values.region?.value || '');

  usePrefillProfile({
    setProfileCompleted: () => {},
    setValues,
    interestOptions,
    hobbyOptions: profileHobbyOptions,
    maritalStatusOptions,
    locationApi,
    profileApi,
  });

  // EFFECTS
  useEffect(() => {
    const id = setTimeout(() => {
      const normalized = normalizeForValidation(values);
      setErrors(translateValidationErrors(validateEditProfile(normalized), t));
    }, 250);

    return () => clearTimeout(id);
  }, [values, t]);

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

  // HANDLERS
  const setField = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setSubmitError('');
  };

  const onBlur = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const pickAvatar = () => {
    setAvatarError('');
    fileRef.current?.click?.();
  };

  const handlePickForCrop = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!okTypes.includes(file.type)) {
      setAvatarError(t('profile.editForm.toast.invalidFileType'));
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
      toast.success(t('profile.editForm.toast.avatarUpdated'));
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? t('profile.toast.avatarSessionExpired')
          : getApiErrorMessage(err, 'profile.editForm.toast.avatarUpdateError');
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
      toast.success(t('profile.editForm.toast.avatarDeleted'));
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? t('profile.toast.avatarSessionExpired')
          : getApiErrorMessage(err, 'profile.editForm.toast.avatarDeleteError');
      toast.error(String(msg));
      setAvatarError(String(msg));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      username: true,
      birthDate: true,
    });

    const submitValues = applyBirthDateNormalization(values);
    if (submitValues.birthDate !== values.birthDate) {
      setValues(submitValues);
    }

    const normalized = normalizeForValidation(submitValues);
    const nextErrors = translateValidationErrors(validateEditProfile(normalized), t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const username = values.username?.trim();
    if (username) {
      try {
        const res = await usersApi.getByUsername(username);
        const data = res?.data ?? res;
        const currentUserId = user?.id;
        if (data?.id && data.id !== currentUserId) {
          setErrors((prev) => ({
            ...prev,
            username: t('profile.editForm.errors.usernameTaken'),
          }));
          return;
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          setSubmitError(err?.message || t('profile.editForm.errors.usernameCheckError'));
          return;
        }
      }
    }

    const safeValues = applyBirthDateNormalization({
      ...submitValues,
      languages: values.languagesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });

    const payload = toEditProfilePayload(safeValues);
    console.log('PAYLOAD', payload);
    try {
      setIsSubmitting(true);
      await onSave?.(payload);
    } catch (err) {
      console.log('ERR RAW', err);
      const code = getApiErrorCode(err) || '';
      const msg = code === 'CONFLICT' && payload.phone
        ? t('errors.PHONE_ALREADY_EXISTS')
        : getApiErrorMessage(err) || t('profile.editForm.errors.updateError');
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // HELPERS
  const showError = (key) => Boolean(touched[key] && errors[key]);

  // REACT-SELECT: portal on desktop, inline on mobile
  const selectCommonProps = useProfileSelectProps();

  const currentAvatarSrc = backendAvatarUrl;

  return (
    <div className="edit-profile">
      <form className="edit-profile__form" onSubmit={handleSubmit}>
        <div className="ep-topbar">
          <button
            type="button"
            className="back-arrow"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <img
              src={profileIcons.arrowGradient}
              alt=""
              aria-hidden="true"
              className="back-arrow__icon"
            />
          </button>

          <div className="ep-topbar__brand app-brand-wordmark">ME YOU</div>

          <div className="ep-topbar__right">
            <ThemeToggleDark />
          </div>
        </div>
        <div className="ep-divider" />
        {/* HEADER */}
        <div className="ep-head">
          <div className="ep-head__title">{t('profile.editForm.title')}</div>

          <div className="ep-avatar">
            <div className="ep-avatar__ring" onClick={pickAvatar} role="button" tabIndex={0}>
              {currentAvatarSrc ? (
                <img
                  className="ep-avatar__img"
                  src={currentAvatarSrc}
                  alt={t('profile.editForm.avatarAlt')}
                />
              ) : (
                <div className="ep-avatar__placeholder" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="ep-avatar__icon">
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

          <div className="ep-head__link">{t('profile.editForm.changePhoto')}</div>

          <div className="ep-head__actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePickForCrop} />

            <button type="button" className="ep-pill" onClick={pickAvatar}>
              {t('profile.editForm.upload')}
            </button>

            {backendAvatarUrl && (
              <button
                type="button"
                className="ep-pill danger"
                onClick={deleteAvatar}
                disabled={isAvatarUploading}
              >
                {isAvatarUploading ? '...' : t('profile.editForm.delete')}
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
              placeholder={t('profile.editForm.fields.lastName')}
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
              placeholder={t('profile.editForm.fields.firstName')}
              value={values.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              onBlur={() => onBlur('firstName')}
            />
          </div>
          {showError('firstName') && <div className="field__hint">{errors.firstName}</div>}
        </div>
        {/* NICKNAME */}
        <div className="field">
          <div className="field__wrap">
            <input
              className={`text-input ${showError('username') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.username')}
              value={values.username}
              onChange={(e) => setField('username', e.target.value)}
              onBlur={() => onBlur('username')}
              maxLength={10}
              aria-required="true"
            />
          </div>
          {showError('username') && <div className="field__hint">{errors.username}</div>}
        </div>
        {/* СТАТЬ + ВІК: десктоп/планшет — 2 поля в одному рядку; мобілка — кожне поле - свій рядок */}
        <div className="grid-2">
          <div
            className={`field field--gender ${genderPickerOpen ? 'field--genderOpen' : ''}`}
            ref={genderDropdownRef}
          >
            {/* Десктоп/планшет: текст "СТАТЬ" навпроти опцій (один ряд) */}
            <div className="field__genderWrap field__genderWrap--desktop">
              <label className="field__label field__label--row">
                {t('profile.editForm.fields.gender')}
              </label>
              <div className="field__genderGroup">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
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
                      {genderOptions.find((o) => o.value === values.gender)?.label ??
                        t('profile.editForm.select')}
                    </span>
                    <span className="field__genderTriggerLabel">
                      {t('profile.editForm.fields.gender')}
                    </span>
                  </span>
                  <span className="field__genderChevron" aria-hidden="true" />
                </button>
              </div>
              {genderPickerOpen && (
                <div
                  className="field__genderDropdown profile-form-dropdown profile-dropdown-menu"
                  role="listbox"
                >
                  {genderOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={values.gender === opt.value}
                      className={`profile-dropdown-option field__genderDropdownItem ${
                        values.gender === opt.value
                          ? 'profile-dropdown-option--selected field__genderDropdownItemActive'
                          : ''
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
            <BirthDateField
              value={values.birthDate}
              onChange={(val) => setField('birthDate', val)}
              onBlur={() => onBlur('birthDate')}
              hasError={showError('birthDate')}
              placeholderText="DD.MM.YYYY"
              ariaLabel={t('profile.editForm.fields.birthDate')}
            />
            {showError('birthDate') && <div className="field__hint">{errors.birthDate}</div>}
          </div>
        </div>
        {/* PHONE */}
        <div className="field">
          <div className="field__wrap phone-wrap">
            <PhoneInput
              defaultCountry="ua"
              value={values.phone}
              onChange={(val) => setField('phone', val)}
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
              placeholder={t('profile.editForm.fields.nationality')}
              value={values.nationality}
              onChange={(e) => setField('nationality', e.target.value)}
              onBlur={() => onBlur('nationality')}
            />
          </div>
          {showError('nationality') && <div className="field__hint">{errors.nationality}</div>}
          <VisibilityToggle
            checked={values.profileVisibility.nationality}
            onChange={(checked) =>
              setValues((prev) => ({
                ...prev,
                profileVisibility: {
                  ...prev.profileVisibility,
                  nationality: checked,
                },
              }))
            }
          />
        </div>
        {/* MARITAL */}
        <div className="field">
          <div className="field__wrap select-wrap">
            <Select
              classNamePrefix="rs"
              placeholder={t('profile.editForm.fields.maritalStatus')}
              value={values.maritalStatus}
              options={maritalStatusOptions}
              onChange={(opt) => setField('maritalStatus', opt)}
              onBlur={() => onBlur('maritalStatus')}
              {...selectCommonProps}
            />
          </div>

          {showError('maritalStatus') && <div className="field__hint">{errors.maritalStatus}</div>}
          <VisibilityToggle
            checked={values.profileVisibility.maritalStatus}
            onChange={(checked) =>
              setValues((prev) => ({
                ...prev,
                profileVisibility: {
                  ...prev.profileVisibility,
                  maritalStatus: checked,
                },
              }))
            }
          />
        </div>

        {/* BIO */}
        <div className="field field--bio">
          <div className="field__wrap">
            <textarea
              className={`text-area ${showError('bio') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.bio')}
              value={values.bio}
              onChange={(e) => setField('bio', e.target.value)}
              onBlur={() => onBlur('bio')}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="field__meta">
            <span className="field__note">{t('profile.editForm.maxCharsNote')} </span>
            <span className="field__counter">{(values.bio || '').length}/500</span>
          </div>
          {showError('bio') && <div className="field__hint">{errors.bio}</div>}
        </div>
        {/* ABOUT */}
        <div className="field field--about">
          <div className="field__wrap">
            <textarea
              className={`text-area ${showError('about') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.about')}
              value={values.about}
              onChange={(e) => setField('about', e.target.value)}
              onBlur={() => onBlur('about')}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="field__meta">
            <span className="field__note">{t('profile.editForm.maxCharsNote')} </span>
            <span className="field__counter">{(values.about || '').length}/2000</span>
          </div>

          {showError('about') && <div className="field__hint">{errors.about}</div>}
          <VisibilityToggle
            checked={values.profileVisibility.about}
            onChange={(checked) =>
              setValues((prev) => ({
                ...prev,
                profileVisibility: {
                  ...prev.profileVisibility,
                  about: checked,
                },
              }))
            }
          />
        </div>

        {/* INTERESTS */}
        <MultiSelect
          value={values.interests}
          onChange={(val) => setField('interests', val)}
          options={interestOptions}
          placeholder={t('profile.editForm.fields.interests')}
          showVisibility
          visibilityValue={values.profileVisibility.interests}
          visibilityLabel={t('profile.editForm.visibility.title')}
          onVisibilityChange={(checked) =>
            setValues((prev) => ({
              ...prev,
              profileVisibility: {
                ...prev.profileVisibility,
                interests: checked,
              },
            }))
          }
          onBlur={() => onBlur('interests')}
          error={showError('interests') && errors.interests}
          maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
          selectProps={selectCommonProps}
        />

        {/* HOBBIES */}
        <MultiSelect
          value={values.hobbies}
          onChange={(val) => setField('hobbies', val)}
          options={profileHobbyOptions}
          placeholder={t('profile.editForm.fields.hobbies')}
          showVisibility
          visibilityValue={values.profileVisibility.hobbies}
          visibilityLabel={t('profile.editForm.visibility.title')}
          onVisibilityChange={(checked) =>
            setValues((prev) => ({
              ...prev,
              profileVisibility: {
                ...prev.profileVisibility,
                hobbies: checked,
              },
            }))
          }
          onBlur={() => onBlur('hobbies')}
          error={showError('hobbies') && errors.hobbies}
          maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
          selectProps={selectCommonProps}
        />

        <div className="grid-2">
          {/* PROFESSION */}
          <div className="field">
            <div className="field__wrap">
              <input
                className={`text-input ${showError('profession') ? 'is-error' : ''}`}
                placeholder={t('profile.editForm.fields.profession')}
                value={values.profession}
                onChange={(e) => setField('profession', e.target.value)}
                onBlur={() => onBlur('profession')}
              />
            </div>
            {showError('profession') && <div className="field__hint">{errors.profession}</div>}
            <VisibilityToggle
              checked={values.profileVisibility.profession}
              onChange={(checked) =>
                setValues((prev) => ({
                  ...prev,
                  profileVisibility: {
                    ...prev.profileVisibility,
                    profession: checked,
                  },
                }))
              }
            />
          </div>
          {/* LANGUAGES */}
          <div className="field">
            <div className="field__wrap">
              <input
                className={`text-input ${showError('languages') ? 'is-error' : ''}`}
                placeholder={t('profile.editForm.fields.languages')}
                value={values.languagesInput}
                onChange={(e) => setField('languagesInput', e.target.value)}
                onBlur={() => onBlur('languages')}
              />
            </div>
            {showError('languages') && <div className="field__hint">{errors.languages}</div>}
            <VisibilityToggle
              checked={values.profileVisibility.languages}
              onChange={(checked) =>
                setValues((prev) => ({
                  ...prev,
                  profileVisibility: {
                    ...prev.profileVisibility,
                    languages: checked,
                  },
                }))
              }
            />
          </div>
        </div>
        {/* COUNTRY + REGION + CITY */}
        <div className="grid-3">
          <div className="field">
            <div className="field__wrap select-wrap">
              <Select
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.country')}
                value={values.country}
                options={countryOptions}
                onChange={(opt) => {
                  setValues((prev) => ({
                    ...prev,
                    country: opt,
                    region: null,
                    city: null,
                  }));
                }}
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
                placeholder={t('profile.editForm.fields.region')}
                value={values.region}
                options={regionOptions}
                isDisabled={!values.country}
                isLoading={isRegionsLoading}
                onChange={(opt) =>
                  setValues((prev) => ({
                    ...prev,
                    region: opt,
                    city: null,
                  }))
                }
                onBlur={() => onBlur('region')}
                {...selectCommonProps}
              />
            </div>
            {showError('region') && <div className="field__hint">{errors.region}</div>}
          </div>

          <div className="field">
            <div className="field__wrap">
              {cityInputMode === 'manual' ? (
                <input
                  className={`text-input ${showError('city') ? 'is-error' : ''}`}
                  placeholder={t('profile.editForm.fields.city')}
                  value={typeof values.city === 'string' ? values.city : values.city?.value || ''}
                  onChange={(e) => setField('city', e.target.value)}
                  onBlur={() => onBlur('city')}
                  disabled={!values.country || (regionOptions.length > 0 && !values.region)}
                />
              ) : (
                <div className="select-wrap">
                  <Select
                    classNamePrefix="rs"
                    placeholder={t('profile.editForm.fields.city')}
                    value={typeof values.city === 'string' ? null : values.city}
                    options={cityOptions}
                    isDisabled={!values.country}
                    isLoading={isCitiesLoading}
                    onChange={(opt) => setField('city', opt)}
                    onBlur={() => onBlur('city')}
                    {...selectCommonProps}
                  />
                </div>
              )}
            </div>
            {showError('city') && <div className="field__hint">{errors.city}</div>}
          </div>
          <VisibilityToggle
            checked={values.profileVisibility.location}
            label={t('profile.editForm.visibility.location')}
            onChange={(checked) =>
              setValues((prev) => ({
                ...prev,
                profileVisibility: {
                  ...prev.profileVisibility,
                  location: checked,
                },
              }))
            }
          />
        </div>
        <div className="grid-3">
          {/* TELEGRAM */}
          <div className="field">
            <div className="field__wrap">
              <input
                className={`text-input ${showError('telegram') ? 'is-error' : ''}`}
                placeholder="Telegram"
                value={values.telegram}
                onChange={(e) => setField('telegram', e.target.value)}
                onBlur={() => onBlur('telegram')}
              />

              <VisibilityToggle
                checked={values.profileVisibility.telegram}
                label={t('profile.editForm.visibility.telegram')}
                onChange={(checked) =>
                  setValues((prev) => ({
                    ...prev,
                    profileVisibility: {
                      ...prev.profileVisibility,
                      telegram: checked,
                    },
                  }))
                }
              />
            </div>

            {showError('telegram') && <div className="field__hint">{errors.telegram}</div>}
          </div>{' '}
          {/* INSTAGRAM */}
          <div className="field">
            <div className="field__wrap">
              <input
                className={`text-input ${showError('instagram') ? 'is-error' : ''}`}
                placeholder="Instagram"
                value={values.instagram}
                onChange={(e) => setField('instagram', e.target.value)}
                onBlur={() => onBlur('instagram')}
              />

              <VisibilityToggle
                checked={values.profileVisibility.instagram}
                label={t('profile.editForm.visibility.instagram')}
                onChange={(checked) =>
                  setValues((prev) => ({
                    ...prev,
                    profileVisibility: {
                      ...prev.profileVisibility,
                      instagram: checked,
                    },
                  }))
                }
              />
            </div>

            {showError('instagram') && <div className="field__hint">{errors.instagram}</div>}
          </div>{' '}
          {/* TIKTOK */}
          <div className="field">
            <div className="field__wrap">
              <input
                className={`text-input ${showError('tiktok') ? 'is-error' : ''}`}
                placeholder="TikTok"
                value={values.tiktok}
                onChange={(e) => setField('tiktok', e.target.value)}
                onBlur={() => onBlur('tiktok')}
              />

              <VisibilityToggle
                checked={values.profileVisibility.tiktok}
                label={t('profile.editForm.visibility.tiktok')}
                onChange={(checked) =>
                  setValues((prev) => ({
                    ...prev,
                    profileVisibility: {
                      ...prev.profileVisibility,
                      tiktok: checked,
                    },
                  }))
                }
              />
            </div>

            {showError('tiktok') && <div className="field__hint">{errors.tiktok}</div>}
          </div>
        </div>
        {submitError && <div className="field__hint">{submitError}</div>}
        <button className="btn-gradient wide" disabled={isSubmitting}>
          {isSubmitting ? t('profile.editForm.saving') : t('profile.editForm.saveChanges')}
        </button>
      </form>

      {/* CROP MODAL */}
      {isCropOpen && (
        <AvatarCropModal src={cropSrc} onClose={closeCrop} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}

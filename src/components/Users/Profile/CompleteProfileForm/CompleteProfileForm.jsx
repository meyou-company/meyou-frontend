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

import {
  validateCompleteProfile,
  translateValidationErrors,
} from '../../../../utils/validationProfile';
import { normalizeForValidation, toCompleteProfilePayload } from '../../../../utils/profilePayload';
import { cropImageToFile } from '../../../../utils/cropImageToFile';
import { getApiErrorCode, getApiErrorMessage, getApiErrorSuggestions } from '../../../../utils/getApiErrorMessage';
import { applyBirthDateNormalization } from '../../../../utils/profileFormUtils';

import { interestOptions } from '../../../../constants/interests';
import { profileHobbyOptions } from '../../../../constants/hobbies';

import ThemeToggleDark from '../../../../components/ThemeToggleDark/ThemeToggleDark';
import AvatarCropModal from '../../../../components/AvatarCropModal/AvatarCropModal';
import BirthDateField from '../BirthDateField/BirthDateField';

import './CompleteProfileForm.scss';
import profileIcons from '../../../../constants/profileIcons';
import MultiSelect from '../EditProfileForm/MultiSelect';

const EMPTY = {
  firstName: '',
  lastName: '',
  username: '',
  gender: null,
  birthDate: '',
  phone: '',

  nationality: '',
  maritalStatus: null,
  bio: '',

  interests: [],
  hobbies: [],

  country: null,
  city: null,
};

export default function CompleteProfileForm({ onBack, onSave }) {
  // I18N / OPTIONS
  const { t } = useTranslation();

  const genderOptions = useGenderOptions();
  const maritalStatusOptions = useMaritalStatusOptions();

  // FORM STATE
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const [submitError, setSubmitError] = useState('');
  const [submitErrorCode, setSubmitErrorCode] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState({
    loading: false,
    available: null,
    suggestions: [],
  });

  const [profileCompleted, setProfileCompleted] = useState(false);

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
  const { countryOptions, cityOptions, cityInputMode, isCitiesLoading } =
    useLocationOptions(values.country?.value || '', '');

  usePrefillProfile({
    setProfileCompleted,
    setValues,
    interestOptions,
    hobbyOptions: profileHobbyOptions,
    maritalStatusOptions,
    locationApi,
    profileApi,
  });

  // EFFECTS
  useEffect(() => {
    const normalized = normalizeForValidation(values);
    setErrors(translateValidationErrors(validateCompleteProfile(normalized), t));
  }, [values, t]);

  useEffect(() => {
    const raw = String(values.username || '').trim();
    if (!raw || errors.username) {
      setUsernameCheck({ loading: false, available: null, suggestions: [] });
      if (errors.username) {
        setUsernameSuggestions([]);
      }
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setUsernameCheck((prev) => ({ ...prev, loading: true }));
        const res = await usersApi.checkUsername(raw);
        const data = res?.data ?? res;
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setUsernameCheck({
          loading: false,
          available: data?.available === true,
          suggestions,
        });
        if (data?.available === false && suggestions.length > 0) {
          setUsernameSuggestions(suggestions);
        }
      } catch {
        setUsernameCheck({ loading: false, available: null, suggestions: [] });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [values.username, errors.username]);

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
    const nextValue =
      key === 'username' && typeof val === 'string'
        ? val.replace(/\s+/g, '')
        : val;
    setValues((v) => ({ ...v, [key]: nextValue }));
    setSubmitError('');
    setSubmitErrorCode('');
    if (key === 'username') {
      setUsernameSuggestions([]);
    }
  };
  const onBlur = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

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
      username: true,
      phone: true,
      nationality: true,
      interests: true,
      hobbies: true,
      country: true,
      city: true,
      gender: true,
      birthDate: true,
    });

    const submitValues = applyBirthDateNormalization(values);
    if (submitValues.birthDate !== values.birthDate) {
      setValues(submitValues);
    }

    const normalized = normalizeForValidation(submitValues);
    const nextErrors = translateValidationErrors(validateCompleteProfile(normalized), t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    if (usernameCheck.loading) {
      setSubmitError(t('common.loading'));
      return;
    }

    if (usernameCheck.available === false) {
      const takenMsg = t('errors.USERNAME_TAKEN');
      setSubmitError(takenMsg);
      setSubmitErrorCode('USERNAME_TAKEN');
      toast.error(takenMsg);
      if (usernameSuggestions.length === 0 && usernameCheck.suggestions.length > 0) {
        setUsernameSuggestions(usernameCheck.suggestions);
      }
      return;
    }

    const payload = toCompleteProfilePayload(submitValues);

    try {
      setIsSubmitting(true);
      await onSave?.(payload);
      setProfileCompleted(true);
    } catch (err) {
      console.log('[CompleteProfileForm] submit error', err?.response?.data || err);

      const code = getApiErrorCode(err) || '';
      const msg = getApiErrorMessage(err) || t('profile.completeForm.errors.saveError');
      let suggestions = getApiErrorSuggestions(err);

      setSubmitError(msg);
      setSubmitErrorCode(code);
      toast.error(msg);

      if (code === 'USERNAME_TAKEN') {
        setUsernameCheck((prev) => ({
          ...prev,
          loading: false,
          available: false,
        }));
        setTouched((prev) => ({ ...prev, username: true }));

        if (!suggestions.length && values.username?.trim()) {
          try {
            const res = await usersApi.checkUsername(values.username.trim());
            const data = res?.data ?? res;
            if (Array.isArray(data?.suggestions)) {
              suggestions = data.suggestions;
            }
          } catch {
            /* check endpoint optional */
          }
        }

        if (suggestions.length > 0) {
          setUsernameSuggestions(suggestions);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // HELPERS
  const showError = (key) => Boolean(touched[key] && errors[key]);
  const showStar = (key) => {
    const requiredKeys = [
      'lastName',
      'firstName',
      'username',
      'phone',
      'nationality',
      'interests',
      'hobbies',
      'country',
      'city',
      'birthDate',
      'gender',
    ];
    if (!requiredKeys.includes(key)) return false;

    const v = values[key];
    const isEmpty =
      v === null ||
      v === undefined ||
      (typeof v === 'string' && !v.trim()) ||
      (Array.isArray(v) && v.length === 0);

    if (isEmpty) return true;

    if (key === 'phone') {
      const onlyCountryCode = v && typeof v === 'string' && v.trim().length <= 4;

      return !v || onlyCountryCode;
    }

    if (key === 'gender') {
      if (values.gender !== 'MALE' && values.gender !== 'FEMALE') return true;
    }
    if (touched[key] && errors[key]) return true;
    return false;
  };

  // REACT-SELECT: portal on desktop, inline on mobile
  const selectCommonProps = useProfileSelectProps();

  const currentAvatarSrc = backendAvatarUrl;

  const submitLabel = isSubmitting
    ? t('profile.completeForm.saving')
    : profileCompleted
      ? t('profile.completeForm.update')
      : t('profile.completeForm.save');

  const showUsernameTaken =
    usernameCheck.available === false || submitErrorCode === 'USERNAME_TAKEN';
  const displayedUsernameSuggestions =
    usernameSuggestions.length > 0 ? usernameSuggestions : usernameCheck.suggestions;

  const renderUsernameSuggestions = () =>
    displayedUsernameSuggestions.length > 0 ? (
      <div className="complete-profile__usernameSuggestions">
        {displayedUsernameSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="cp-pill"
            onClick={() => {
              setField('username', suggestion);
              onBlur('username');
            }}
          >
            @{suggestion}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="complete-profile">
      <form className="complete-profile__form" onSubmit={handleSubmit}>
        <div className="cp-topbar">
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

          <div className="cp-topbar__brand app-brand-wordmark">ME YOU</div>

          <div className="cp-topbar__right">
            <ThemeToggleDark />
          </div>
        </div>

        <div className="cp-divider" />
        {/* HEADER */}
        <div className="cp-head">
          <div className="cp-head__title">{t('profile.completeForm.title')}</div>

          <div className="cp-avatar">
            <div className="cp-avatar__ring" onClick={pickAvatar} role="button" tabIndex={0}>
              {currentAvatarSrc ? (
                <img
                  className="cp-avatar__img"
                  src={currentAvatarSrc}
                  alt={t('profile.editForm.avatarAlt')}
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

          <div className="cp-head__link">{t('profile.completeForm.addPhoto')}</div>
          <div className="cp-head__note">{t('profile.completeForm.photoNote')}</div>

          <div className="cp-head__actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePickForCrop} />

            <button type="button" className="cp-pill" onClick={pickAvatar}>
              {t('profile.editForm.upload')}
            </button>

            <button
              type="button"
              className="cp-pill danger"
              onClick={deleteAvatar}
              disabled={isAvatarUploading}
            >
              {isAvatarUploading ? '...' : t('profile.editForm.delete')}
            </button>
          </div>

          {avatarError && <div className="auth__error">{avatarError}</div>}
        </div>
        {/* LAST NAME */}
        <div className="field">
          <div className="field__wrap">
            {showStar('lastName') && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError('lastName') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.lastName')}
              value={values.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              onBlur={() => onBlur('lastName')}
              required
            />
          </div>
          {showError('lastName') && <div className="field__hint">{errors.lastName}</div>}
        </div>
        {/* NAME */}
        <div className="field">
          <div className="field__wrap">
            {showStar('firstName') && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError('firstName') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.firstName')}
              value={values.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              onBlur={() => onBlur('firstName')}
              required
            />
          </div>
          {showError('firstName') && <div className="field__hint">{errors.firstName}</div>}
        </div>
        {/* NICKNAME */}
        <div className="field">
          <div className="field__wrap">
            {showStar('username') && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError('username') || showUsernameTaken ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.username')}
              value={values.username}
              onChange={(e) => setField('username', e.target.value)}
              onBlur={() => onBlur('username')}
              maxLength={10}
              aria-required="true"
            />
          </div>
          {showError('username') && <div className="field__hint">{errors.username}</div>}
          {!showError('username') && usernameCheck.loading ? (
            <div className="field__hint">{t('common.loading')}</div>
          ) : null}
          {!showError('username') && showUsernameTaken ? (
            <div className="field__hint">{t('errors.USERNAME_TAKEN')}</div>
          ) : null}
          {!showError('username') && showUsernameTaken ? renderUsernameSuggestions() : null}
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
                {showStar('gender') && <span className="field__star">*</span>}
                {t('profile.editForm.fields.gender')}
              </label>
              <div className="field__genderGroup">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`field__genderBtn ${values.gender === opt.value ? 'field__genderBtnActive' : ''}`}
                    onClick={() => setField('gender', opt.value)}
                    onBlur={() => onBlur('gender')}
                    required
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
                  {showStar('gender') && <span className="field__star">*</span>}
                  <span className="field__genderTriggerText">
                    <span
                      className={`field__genderTriggerValue ${!values.gender ? 'field__genderTriggerValue--placeholder' : ''}`}
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
                      required
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
              showStar={showStar('birthDate')}
              placeholderText="DD.MM.YYYY"
              ariaLabel={t('profile.editForm.fields.birthDate')}
              required
            />
            {showError('birthDate') && <div className="field__hint">{errors.birthDate}</div>}
          </div>
        </div>
        {/* PHONE */}
        <div className="field">
          <div className="field__wrap phone-wrap">
            {showStar('phone') && <span className="field__star">*</span>}
            <PhoneInput
              defaultCountry="ua"
              value={values.phone}
              onChange={(val) => setField('phone', val)}
              onBlur={() => onBlur('phone')}
              required
              inputClassName={`phone-input ${showError('phone') ? 'is-error' : ''}`}
            />
          </div>
          {showError('phone') && <div className="field__hint">{errors.phone}</div>}
        </div>
        {/* NATIONALITY */}
        <div className="field">
          <div className="field__wrap">
            {showStar('nationality') && <span className="field__star">*</span>}
            <input
              className={`text-input ${showError('nationality') ? 'is-error' : ''}`}
              placeholder={t('profile.editForm.fields.nationality')}
              value={values.nationality}
              onChange={(e) => setField('nationality', e.target.value)}
              onBlur={() => onBlur('nationality')}
              required
            />
          </div>
          {showError('nationality') && <div className="field__hint">{errors.nationality}</div>}
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
        {/* INTERESTS */}
        <MultiSelect
          value={values.interests}
          onChange={(val) => setField('interests', val)}
          options={interestOptions}
          placeholder={t('profile.editForm.fields.interests')}
          onBlur={() => onBlur('interests')}
          error={showError('interests') && errors.interests}
          maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
          selectProps={selectCommonProps}
          showStar={showStar('interests')}
        />
        {/* HOBBIES */}
        <MultiSelect
          value={values.hobbies}
          onChange={(val) => setField('hobbies', val)}
          options={profileHobbyOptions}
          placeholder={t('profile.editForm.fields.hobbies')}
          showStar={showStar('hobbies')}
          onBlur={() => onBlur('hobbies')}
          error={showError('hobbies') && errors.hobbies}
          maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
          selectProps={selectCommonProps}
        />
        {/* COUNTRY + CITY */}
        <div className="grid-2">
          <div className="field">
            <div className="field__wrap select-wrap">
              {showStar('country') && <span className="field__star">*</span>}
              <Select
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.country')}
                value={values.country}
                options={countryOptions}
                onChange={(opt) => {
                  setValues((prev) => ({
                    ...prev,
                    country: opt,
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
              {showStar('city') && <span className="field__star">*</span>}
              {cityInputMode === 'manual' ? (
                <input
                  className={`text-input ${showError('city') ? 'is-error' : ''}`}
                  placeholder={t('profile.editForm.fields.city')}
                  value={typeof values.city === 'string' ? values.city : values.city?.value || ''}
                  onChange={(e) => setField('city', e.target.value)}
                  onBlur={() => onBlur('city')}
                  disabled={!values.country}
                  required
                />
              ) : (
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
              )}
            </div>
            {showError('city') && <div className="field__hint">{errors.city}</div>}
          </div>
        </div>

        {submitError ? (
          <div className="complete-profile__submitError" role="alert" data-testid="complete-profile-submit-error">
            {submitError}
          </div>
        ) : null}
        {showUsernameTaken ? renderUsernameSuggestions() : null}

        <button
          className="btn-gradient wide"
          disabled={isSubmitting || usernameCheck.loading}
        >
          {submitLabel}
        </button>
      </form>
      {/* CROP MODAL */}
      {isCropOpen && (
        <AvatarCropModal src={cropSrc} onClose={closeCrop} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}

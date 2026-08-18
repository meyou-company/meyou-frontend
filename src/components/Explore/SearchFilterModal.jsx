import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';
import Select from 'react-select';

import { interestOptions } from '../../constants/interests';
import { useGenderOptions, useMaritalStatusOptions } from '../../hooks/useProfileFormOptions';
import { useLocationSystem } from '../../hooks/useLocationSystem';

import MultiSelect from '../Users/Profile/EditProfileForm/MultiSelect';
import VisibilityToggle from '../Users/Profile/EditProfileForm/VisibilityToggle';

import './SearchFilterModal.scss';

export default function SearchFilterModal({
  isOpen,
  onClose,
  onApply,
  initialParams = {},
  resultCount,
}) {
  // I18N / OPTIONS
  const { t } = useTranslation();
  // HOOKS
  const genderOptions = useGenderOptions();
  const maritalStatusOptions = useMaritalStatusOptions();

  const searchGenderOptions = useMemo(
    () => [{ value: 'ANY', label: t('search.filters.gender.any') }, ...genderOptions],
    [genderOptions, t]
  );

  const searchMaritalOptions = useMemo(
    () => [{ value: 'ANY', label: t('search.filters.maritalStatus.any') }, ...maritalStatusOptions],
    [maritalStatusOptions, t]
  );

  const defaultFilter = useMemo(
    () => ({
      nearMe: true,
      country: null,
      city: null,
      gender: searchGenderOptions[0],
      maritalStatus: searchMaritalOptions[0],
      ageMin: 18,
      ageMax: 30,
      interestsEnabled: true,
      selectedInterests: [],
      online: false,
      vip: false,
      new: false,
    }),
    [searchGenderOptions, searchMaritalOptions]
  );

  const [f, setF] = useState(defaultFilter);

  // CUSTOM HOOKS
  const { countries, cities, citiesLoading } = useLocationSystem(f.country?.value || '');

  // REACT-SELECT PORTAL
  const selectCommonProps = useMemo(
    () => ({
      menuPortalTarget: document.body,
      menuPosition: 'fixed',
      styles: {
        menuPortal: (base) => ({
          ...base,
          zIndex: 1010,
        }),
      },
    }),
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    setF({
      ...defaultFilter,

      nearMe: initialParams.nearMe ?? true,

      country: countries.find((c) => c.value === initialParams.country) ?? null,

      city: null,

      gender:
        searchGenderOptions.find((g) => g.value === initialParams.gender) ?? searchGenderOptions[0],

      maritalStatus:
        searchMaritalOptions.find((m) => m.value === initialParams.maritalStatus) ??
        searchMaritalOptions[0],

      ageMin: initialParams.ageMin ?? 18,
      ageMax: initialParams.ageMax ?? 30,

      selectedInterests: Array.isArray(initialParams.interests)
        ? interestOptions.filter((option) => initialParams.interests.includes(option.value))
        : [],

      online: initialParams.online ?? false,
      vip: initialParams.vip ?? false,
      new: initialParams.new ?? false,
    });
  }, [isOpen, initialParams, countries, searchGenderOptions, searchMaritalOptions, defaultFilter]);

  useEffect(() => {
    if (!isOpen) return;

    if (!initialParams.city) return;

    if (!cities.length) return;

    setF((prev) => ({
      ...prev,
      city: cities.find((c) => c.value === initialParams.city) ?? null,
    }));
  }, [isOpen, cities, initialParams.city]);

  const reset = useCallback(() => {
    setF(defaultFilter);
  }, [defaultFilter]);

  const handleApply = useCallback(() => {
    const payload = {
      nearMe: f.nearMe,
      country: f.nearMe ? undefined : f.country?.value,
      city: f.nearMe ? undefined : f.city?.value,
      gender: f.gender?.value === 'ANY' ? undefined : f.gender?.value,
      maritalStatus: f.maritalStatus?.value === 'ANY' ? undefined : f.maritalStatus?.value,
      ageMin: f.ageMin,
      ageMax: f.ageMax,
      interests:
        f.interestsEnabled && f.selectedInterests.length
          ? f.selectedInterests.map((i) => i.value)
          : undefined,
      online: f.online,
      vip: f.vip,
      new: f.new,
    };

    onApply(payload);

    onClose();
  }, [f, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="search-filter-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="search-filter-wrap search-filter-wrap--single"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-filter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-filter search-filter--filters">
          <header className="search-filter__header search-filter__header--withClose">
            <h2 id="search-filter-title" className="search-filter__title">
              {t('search.filters.filterTitle')}
            </h2>
            <button
              type="button"
              className="search-filter__close"
              onClick={onClose}
              aria-label="Закрити"
            >
              ×
            </button>
          </header>

          <div className="search-filter__body">
            {/* LOCATION */}
            <section className="search-filter__block">
              <VisibilityToggle
                className="search-filter__toggle"
                checked={f.nearMe}
                onChange={(checked) =>
                  setF((prev) => ({
                    ...prev,
                    nearMe: checked,
                  }))
                }
                icon={<span aria-hidden="true">📍</span>}
                label={t('search.filters.location')}
                description={t('search.filters.near')}
              />
              <div className="search-filter__row">
                {/* COUNTRY + CITY */}
                <Select
                  className="select-wrap select-wrap--compact"
                  classNamePrefix="rs"
                  placeholder={t('profile.editForm.fields.country')}
                  isDisabled={f.nearMe}
                  value={f.country}
                  options={countries}
                  onChange={(opt) =>
                    setF((p) => ({
                      ...p,
                      country: opt,
                      city: null,
                    }))
                  }
                  {...selectCommonProps}
                />
                <Select
                  className="select-wrap select-wrap--compact"
                  classNamePrefix="rs"
                  placeholder={t('profile.editForm.fields.city')}
                  value={f.city}
                  options={cities}
                  isDisabled={f.nearMe || !f.country}
                  isLoading={citiesLoading}
                  onChange={(opt) =>
                    setF((p) => ({
                      ...p,
                      city: opt,
                    }))
                  }
                  {...selectCommonProps}
                />
              </div>
            </section>

            {/* GENDER */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Стать</span>

              <Select
                className="select-wrap select-wrap--compact"
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.gender')}
                options={searchGenderOptions}
                value={f.gender}
                onChange={(opt) =>
                  setF((p) => ({
                    ...p,
                    gender: opt,
                  }))
                }
                {...selectCommonProps}
              />
            </section>

            {/* MARITAL */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">{t('search.filters.marital')}</span>
              <Select
                className="select-wrap select-wrap--compact"
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.maritalStatus')}
                options={searchMaritalOptions}
                value={f.maritalStatus}
                onChange={(opt) =>
                  setF((p) => ({
                    ...p,
                    maritalStatus: opt,
                  }))
                }
                {...selectCommonProps}
              />
            </section>

            {/* AGE */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">{t('search.filters.age')}</span>
              <div className="search-filter__ageSliderRow">
                <span className="search-filter__ageSliderValue" aria-live="polite">
                  {f.ageMax}
                </span>
                <input
                  type="range"
                  className="search-filter__range search-filter__range--age"
                  min={18}
                  max={100}
                  step={1}
                  value={f.ageMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setF((p) => ({ ...p, ageMax: v }));
                  }}
                  aria-label={t('search.filters.ageTo')}
                />
                <span className="search-filter__ageSliderMax">100</span>
              </div>
            </section>

            {/* INTERESTS */}
            <section className="search-filter__block">
              <VisibilityToggle
                className="search-filter__toggle"
                checked={f.interestsEnabled}
                onChange={(checked) =>
                  setF((prev) => ({
                    ...prev,
                    interestsEnabled: checked,
                  }))
                }
                label={t('profile.editForm.fields.interests')}
              />

              <MultiSelect
                className="select-wrap--compact"
                value={f.selectedInterests}
                onChange={(selectedInterests) =>
                  setF((prev) => ({
                    ...prev,
                    selectedInterests,
                  }))
                }
                options={interestOptions}
                placeholder={t('profile.editForm.fields.interests')}
                disabled={!f.interestsEnabled}
                maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
                selectProps={selectCommonProps}
              />
            </section>
            {/* ONLINE */}
            <section className="search-filter__block">
              <VisibilityToggle
                className="search-filter__toggle"
                checked={f.online}
                onChange={(checked) =>
                  setF((prev) => ({
                    ...prev,
                    online: checked,
                  }))
                }
                label={t('search.filters.online')}
              />
            </section>

            {/* VIP */}
            <section className="search-filter__block">
              <VisibilityToggle
                className="search-filter__toggle"
                checked={f.vip}
                onChange={(checked) =>
                  setF((prev) => ({
                    ...prev,
                    vip: checked,
                  }))
                }
                label={t('search.filters.vip')}
              />
            </section>

            {/* NEW */}
            <section className="search-filter__block">
              <VisibilityToggle
                className="search-filter__toggle"
                checked={f.new}
                onChange={(checked) =>
                  setF((prev) => ({
                    ...prev,
                    new: checked,
                  }))
                }
                label={t('search.filters.new')}
                description={t('search.filters.newDescription')}
              />
            </section>
          </div>

          <footer className="search-filter__footer search-filter__footer--single">
            <div className="search-filter__footerActions">
              <button type="button" className="search-filter__resetBtn" onClick={reset}>
                {t('search.filters.reset')}
              </button>
              <button type="button" className="search-filter__applyBtn" onClick={handleApply}>
                {t('search.filters.apply')}
              </button>
            </div>
            {typeof resultCount === 'number' && (
              <p className="search-filter__resultCount">
                {t('search.filters.resultCount', { count: resultCount })}
              </p>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}

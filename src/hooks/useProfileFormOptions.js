import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { interestOptions } from '../constants/interests';
import { profileHobbyOptions } from '../constants/hobbies';

export function useGenderOptions() {
  const { t } = useTranslation();
  return useMemo(
    () => [
      { value: 'MALE', label: t('profile.editForm.gender.male') },
      { value: 'FEMALE', label: t('profile.editForm.gender.female') },
    ],
    [t]
  );
}

export function useMaritalStatusOptions() {
  const { t } = useTranslation();
  return useMemo(
    () => [
      { value: 'SINGLE', label: t('profile.editForm.maritalStatus.single') },
      { value: 'MARRIED', label: t('profile.editForm.maritalStatus.married') },
      { value: 'DIVORCED', label: t('profile.editForm.maritalStatus.divorced') },
      { value: 'WIDOWED', label: t('profile.editForm.maritalStatus.widowed') },
      { value: 'IN_RELATIONSHIP', label: t('profile.editForm.maritalStatus.inRelationship') },
    ],
    [t]
  );
}

export function useInterestOptions() {
  const { t } = useTranslation();

  return useMemo(
    () =>
      interestOptions.map((value) => ({
        value,
        label: t(`interests.${value}`),
      })),
    [t]
  );
}

export function useHobbyOptions() {
  const { t } = useTranslation();

  return useMemo(
    () =>
      profileHobbyOptions.map((value) => ({
        value,
        label: t(`hobbies.${value}`),
      })),
    [t]
  );
}

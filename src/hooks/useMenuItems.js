import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import profileIcons from '../constants/profileIcons';

export function useMenuItems() {
  const { t } = useTranslation();

  return useMemo(
    () => [
      { id: 'profile', icon: profileIcons.profileBlack, label: t('menu.myProfile') },
      { id: 'edit', icon: profileIcons.pencilBlack, label: t('menu.edit') },
      { id: 'guest', icon: profileIcons.eyeBlack, label: t('menu.viewAsGuest') },
      { id: 'dark', icon: profileIcons.moonBlack, label: t('menu.darkTheme') },
      { id: 'favorites', icon: profileIcons.heartBlack, label: t('menu.favorites') },
      { id: 'blocked', icon: profileIcons.userBlockedBlack, label: t('menu.blocked') },
      { id: 'policy', icon: profileIcons.privacyBlack, label: t('menu.privacy') },
      { id: 'account', icon: profileIcons.settingsBlack, label: t('menu.accountSettings') },
      { id: 'security', icon: profileIcons.lockBmBlack, label: t('menu.security') },
      { id: 'support', icon: profileIcons.helpBlack, label: t('menu.support') },
      { id: 'report', icon: profileIcons.complainBlack, label: t('menu.report') },
      { id: 'about', icon: profileIcons.aboutBlack, label: t('menu.about') },
      { id: 'terms', icon: profileIcons.termsBlack, label: t('menu.terms') },
      { id: 'privacy', icon: profileIcons.confidentialityBlack, label: t('menu.privacyPolicy') },
    ],
    [t],
  );
}

export function useLogoutItem() {
  const { t } = useTranslation();
  return useMemo(
    () => ({ label: t('menu.logout'), icon: profileIcons.exitBlack }),
    [t],
  );
}

export function useCloseMenuItem() {
  const { t } = useTranslation();
  return useMemo(() => ({ label: t('common.close'), icon: profileIcons.close }), [t]);
}

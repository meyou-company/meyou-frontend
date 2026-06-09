import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import profileIcons from '../constants/profileIcons';

export function useMobileProfileNav() {
  const { t } = useTranslation();

  return useMemo(
    () => [
      { key: 'home', path: '/first-page', label: t('navigation.home'), icon: profileIcons.home },
      { key: 'user', path: '/profile', label: t('navigation.profile'), icon: profileIcons.user },
      {
        key: 'notifications',
        type: 'notification',
        path: '/notifications',
        label: t('navigation.notifications'),
        icon: profileIcons.bell,
      },
      { key: 'menu', action: 'MENU', label: t('navigation.menu'), icon: profileIcons.menu },
    ],
    [t],
  );
}

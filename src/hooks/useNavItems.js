import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import profileIcons from '../constants/profileIcons';

export function useNavItems() {
  const { t } = useTranslation();

  return useMemo(
    () => [
      { key: 'home', label: t('nav.home'), icon: 'home', path: '/first-page' },
      { key: 'people', label: t('nav.people'), icon: 'friends', path: '/friends' },
      { key: 'video', label: t('nav.video'), icon: 'video', path: '/video' },
      { key: 'messages', label: t('nav.messages'), icon: 'chat', path: '/messages' },
      { key: 'profile', label: t('nav.profile'), icon: 'user', path: '/profile' },
    ],
    [t],
  );
}

export { profileIcons };

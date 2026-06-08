import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Visitor profile tabs (public / subscribed / vip). */
export function useProfileTabs(options = {}) {
  const { includeUnsubscribe = false, withLocks = false } = options;
  const { t } = useTranslation();

  return useMemo(() => {
    const tabs = [
      { id: 'info', label: t('profile.tabs.info'), locked: false },
      { id: 'stories', label: t('profile.tabs.stories'), locked: false },
      { id: 'video', label: t('profile.tabs.video'), locked: withLocks },
      { id: 'photo', label: t('profile.tabs.photo'), locked: withLocks },
    ];
    if (includeUnsubscribe) {
      return [
        { id: 'delete', label: t('profile.tabs.unsubscribe'), locked: false },
        ...tabs,
      ];
    }
    return tabs;
  }, [t, includeUnsubscribe, withLocks]);
}

/** VIP visitor — no locked tabs. */
export function useVipProfileTabs() {
  const { t } = useTranslation();
  return useMemo(
    () => [
      { id: 'info', label: t('profile.tabs.info') },
      { id: 'stories', label: t('profile.tabs.stories') },
      { id: 'video', label: t('profile.tabs.video') },
      { id: 'photo', label: t('profile.tabs.photo') },
    ],
    [t],
  );
}

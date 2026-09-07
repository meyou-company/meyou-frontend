import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isProfileVipLocked } from '../utils/profileVipUi';

/** Visitor profile tabs (public / subscribed / vip). */
export function useProfileTabs(options = {}) {
  const { includeUnsubscribe = false, withLocks = false, user = null } = options;
  const { t } = useTranslation();

  return useMemo(() => {
    const vipLocked = withLocks
      ? isProfileVipLocked({
          user,
          isOwnProfile: false,
        })
      : false;
    const tabs = [
      { id: 'info', label: t('profile.tabs.info'), locked: false },
      { id: 'stories', label: t('profile.tabs.stories'), locked: false },
      { id: 'video', label: t('profile.tabs.video'), locked: vipLocked },
      { id: 'photo', label: t('profile.tabs.photo'), locked: vipLocked },
    ];
    if (includeUnsubscribe) {
      return [{ id: 'delete', label: t('profile.tabs.unsubscribe'), locked: false }, ...tabs];
    }
    return tabs;
  }, [t, includeUnsubscribe, withLocks, user]);
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
    [t]
  );
}

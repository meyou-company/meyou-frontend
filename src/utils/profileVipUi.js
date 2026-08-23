/**
 * VIP UI helpers for profile visitor views.
 *
 * Backend today does NOT expose `vipEnabled` / `isVipMember` on public profiles.
 * Helpers read optional future fields when present; otherwise default to false so
 * we never invent VIP access silently.
 *
 * Needed API (for full product logic):
 * - owner: `vipEnabled: boolean` (or `vipSettings.enabled`)
 * - viewer↔owner: `subscriptionStatus.isVipMember: boolean`
 *   (or `viewType: 'VIP'` / `isVipMember: true`)
 *
 * Do NOT treat `user.isVip` as membership — that flag is the owner's Explore/VIP account badge.
 */

export function getOwnerVipEnabled(user) {
  if (!user || typeof user !== 'object') return false;
  if (typeof user.vipEnabled === 'boolean') return user.vipEnabled;
  if (typeof user.vipSettings?.enabled === 'boolean') {
    return user.vipSettings.enabled;
  }
  if (typeof user.settings?.vipEnabled === 'boolean') {
    return user.settings.vipEnabled;
  }
  return false;
}

export function getViewerIsVipMember(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.viewType === 'VIP') return true;
  if (user.isVipMember === true) return true;
  if (user.subscriptionStatus?.isVipMember === true) return true;
  if (user.subscriptionStatus?.isVip === true) return true;
  if (user.vipMembership?.active === true) return true;
  return false;
}

/**
 * @param {{ isSubscribed: boolean, user: object|null }} args
 * @returns {{
 *   vipEnabled: boolean,
 *   isVipMember: boolean,
 *   showAddButton: boolean,
 *   showStatus: boolean,
 *   mode: 'info' | 'purchase' | 'hidden' | 'member'
 * }}
 */
export function getVipButtonUi({ isSubscribed, user }) {
  const vipEnabled = getOwnerVipEnabled(user);
  const isVipMember = getViewerIsVipMember(user);

  if (isVipMember) {
    return {
      vipEnabled,
      isVipMember: true,
      showAddButton: false,
      showStatus: true,
      mode: 'member',
    };
  }

  if (!isSubscribed) {
    return {
      vipEnabled,
      isVipMember: false,
      showAddButton: true,
      showStatus: false,
      mode: 'info',
    };
  }

  if (!vipEnabled) {
    return {
      vipEnabled: false,
      isVipMember: false,
      showAddButton: false,
      showStatus: false,
      mode: 'hidden',
    };
  }

  return {
    vipEnabled: true,
    isVipMember: false,
    showAddButton: true,
    showStatus: false,
    mode: 'purchase',
  };
}

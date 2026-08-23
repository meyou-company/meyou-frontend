/**
 * VIP / Messenger UI helpers for profile visitor views.
 *
 * - User.vipEnabled: owner toggle
 * - subscriptionStatus.isVipMember: ACTIVE Follow.isVip (viewer → owner)
 * - isSubscribed: ACTIVE Follow (any isVip)
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

export function getViewerIsSubscribed(user) {
  if (!user || typeof user !== 'object') return false;
  return user.subscriptionStatus?.isSubscribed === true;
}

/**
 * Direct messages locked when owner enabled VIP and viewer is not a VIP member.
 * Regular subscription (`isSubscribed`) does NOT unlock chat when VIP is on.
 */
export function isProfileChatLocked({ user, isOwnProfile = false } = {}) {
  if (isOwnProfile) return false;
  const vipEnabled = getOwnerVipEnabled(user);
  if (!vipEnabled) return false;
  return !getViewerIsVipMember(user);
}

/**
 * Full Messenger write permission (mirrors backend assertCanMessagePeer).
 * @returns {'ok' | 'subscription' | 'vip'}
 */
export function getMessengerWriteDenial({ user, isOwnProfile = false } = {}) {
  if (isOwnProfile) return 'ok';
  if (getOwnerVipEnabled(user)) {
    return getViewerIsVipMember(user) ? 'ok' : 'vip';
  }
  return getViewerIsSubscribed(user) ? 'ok' : 'subscription';
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

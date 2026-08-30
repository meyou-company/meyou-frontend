/**
 * Account-level VIP badge (`User.isVip`).
 * Do not use vipEnabled / isVipMember / Follow.isVip here — those are other VIP types.
 */
export function isUserVip(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.isVip === true) return true;
  if (user.vipFlag === true) return true;
  if (typeof user.accountStatus === 'string' && user.accountStatus.toLowerCase() === 'vip') {
    return true;
  }
  return false;
}

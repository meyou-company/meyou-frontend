import { isUserVip } from './isUserVip.js';
import { getOwnerVipEnabled } from './profileVipUi.js';

/**
 * Profile avatar chrome (gold ring / flip / badge) for anyone viewing this profile.
 * True when the profile owner has User.isVip or vipEnabled.
 * Does not change isUserVip() — Explore / Follow.isVip stay separate.
 */
export function shouldShowProfileVipVisual(user) {
  return isUserVip(user) || getOwnerVipEnabled(user);
}

/** @deprecated Use shouldShowProfileVipVisual */
export function shouldShowOwnProfileVipVisual(user) {
  return shouldShowProfileVipVisual(user);
}

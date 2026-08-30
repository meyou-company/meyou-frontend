import { isUserVip } from './isUserVip.js';
import { getOwnerVipEnabled } from './profileVipUi.js';

/**
 * Own-profile avatar chrome only (gold ring / flip / badge).
 * Does not change isUserVip() — Explore, visitors, Follow.isVip stay separate.
 */
export function shouldShowOwnProfileVipVisual(user) {
  return isUserVip(user) || getOwnerVipEnabled(user);
}

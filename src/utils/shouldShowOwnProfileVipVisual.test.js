import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowProfileVipVisual } from './shouldShowOwnProfileVipVisual.js';
import { isUserVip } from './isUserVip.js';

describe('shouldShowProfileVipVisual', () => {
  it('is true when the profile owner enabled VIP content', () => {
    assert.equal(shouldShowProfileVipVisual({ vipEnabled: true }), true);
  });

  it('is true for account-level User.isVip even if vipEnabled is off', () => {
    assert.equal(shouldShowProfileVipVisual({ isVip: true, vipEnabled: false }), true);
  });

  it('is false when neither account VIP nor owner toggle is on', () => {
    assert.equal(shouldShowProfileVipVisual({ vipEnabled: false }), false);
    assert.equal(shouldShowProfileVipVisual({}), false);
    assert.equal(shouldShowProfileVipVisual(null), false);
  });

  it('does not change isUserVip for vipEnabled-only users', () => {
    assert.equal(isUserVip({ vipEnabled: true }), false);
  });
});

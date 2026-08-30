import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowOwnProfileVipVisual } from './shouldShowOwnProfileVipVisual.js';
import { isUserVip } from './isUserVip.js';

describe('shouldShowOwnProfileVipVisual', () => {
  it('is true when owner enabled VIP content on their profile', () => {
    assert.equal(shouldShowOwnProfileVipVisual({ vipEnabled: true }), true);
  });

  it('is true for account-level User.isVip even if vipEnabled is off', () => {
    assert.equal(shouldShowOwnProfileVipVisual({ isVip: true, vipEnabled: false }), true);
  });

  it('is false when neither account VIP nor owner toggle is on', () => {
    assert.equal(shouldShowOwnProfileVipVisual({ vipEnabled: false }), false);
    assert.equal(shouldShowOwnProfileVipVisual({}), false);
    assert.equal(shouldShowOwnProfileVipVisual(null), false);
  });

  it('does not change isUserVip for vipEnabled-only users', () => {
    assert.equal(isUserVip({ vipEnabled: true }), false);
  });
});

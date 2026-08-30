import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUserVip } from './isUserVip.js';

describe('isUserVip', () => {
  it('returns true only for account-level VIP', () => {
    assert.equal(isUserVip({ isVip: true }), true);
    assert.equal(isUserVip({ vipFlag: true }), true);
    assert.equal(isUserVip({ accountStatus: 'VIP' }), true);
  });

  it('ignores membership / paywall VIP fields', () => {
    assert.equal(isUserVip({ vipEnabled: true }), false);
    assert.equal(isUserVip({ isVipMember: true }), false);
    assert.equal(isUserVip({ subscriptionStatus: { isVipMember: true, isVip: true } }), false);
  });

  it('returns false for missing or non-VIP users', () => {
    assert.equal(isUserVip(null), false);
    assert.equal(isUserVip({ isVip: false }), false);
    assert.equal(isUserVip({}), false);
  });
});

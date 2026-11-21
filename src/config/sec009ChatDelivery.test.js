import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSec009ChatPrivateDeliveryEnabled } from './sec009ChatDelivery.js';

describe('isSec009ChatPrivateDeliveryEnabled', () => {
  it('returns false when env unset', () => {
    assert.equal(isSec009ChatPrivateDeliveryEnabled(), false);
  });
});
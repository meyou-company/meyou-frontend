import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearChatMediaDeliveryCache,
  makeChatDeliveryCacheKey,
  __testGetCacheSize,
} from './chatMediaDeliveryCache.js';

const conv = '11111111-1111-4111-8111-111111111111';
const att = '22222222-2222-4222-8222-222222222222';

describe('chatMediaDeliveryCache', () => {
  it('builds stable cache keys for deduplication', () => {
    assert.equal(
      makeChatDeliveryCacheKey(conv, att),
      `${conv}|${att}`,
    );
  });

  it('clearChatMediaDeliveryCache resets in-memory state', () => {
    clearChatMediaDeliveryCache();
    assert.equal(__testGetCacheSize(), 0);
  });
});
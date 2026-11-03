import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createOptimisticMessage,
  isOptimisticMessageId,
  markOptimisticFailed,
  mergeOutgoingMessage,
} from './optimisticChatMessage.js';

describe('optimistic chat messages', () => {
  it('tags temp ids so they can be replaced after persist', () => {
    const optimistic = createOptimisticMessage({
      clientId: 'abc',
      conversationId: 'conv-1',
      senderId: 'me',
      payload: { type: 'TEXT', text: 'Привіт' },
    });

    assert.equal(optimistic.id, 'optimistic-abc');
    assert.equal(optimistic.pending, true);
    assert.equal(isOptimisticMessageId(optimistic.id), true);
    assert.equal(isOptimisticMessageId('server-id'), false);
  });

  it('replaces the optimistic row with the persisted message and drops duplicates', () => {
    const optimistic = createOptimisticMessage({
      clientId: 'abc',
      conversationId: 'conv-1',
      senderId: 'me',
      payload: { type: 'TEXT', text: 'Привіт' },
    });
    const created = {
      id: 'msg-1',
      clientId: 'abc',
      conversationId: 'conv-1',
      senderId: 'me',
      text: 'Привіт',
      deliveryStatus: 'DELIVERED',
    };

    const merged = mergeOutgoingMessage(
      [optimistic, created],
      optimistic.id,
      created,
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'msg-1');
    assert.equal(merged[0].pending, false);
    assert.equal(merged[0].sendFailed, false);
  });

  it('does not downgrade DELIVERED when a slower SENT confirmation arrives', () => {
    const delivered = {
      id: 'msg-1',
      clientId: 'abc',
      deliveryStatus: 'DELIVERED',
      pending: false,
    };
    const sent = {
      id: 'msg-1',
      clientId: 'abc',
      deliveryStatus: 'SENT',
    };

    const merged = mergeOutgoingMessage([delivered], 'optimistic-abc', sent);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].deliveryStatus, 'DELIVERED');
  });

  it('marks the optimistic bubble as failed without removing it', () => {
    const optimistic = createOptimisticMessage({
      clientId: 'abc',
      conversationId: 'conv-1',
      senderId: 'me',
      payload: { type: 'TEXT', text: 'Привіт' },
    });

    const next = markOptimisticFailed([optimistic], optimistic.id);
    assert.equal(next[0].pending, false);
    assert.equal(next[0].sendFailed, true);
    assert.equal(next[0].text, 'Привіт');
  });
});

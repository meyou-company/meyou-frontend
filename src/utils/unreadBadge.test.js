import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyIncomingUnreadTotal } from './unreadBadge.js';

describe('unread badge after send fan-out', () => {
  it('uses an absolute total when the server sends one', () => {
    assert.equal(applyIncomingUnreadTotal(4, { totalUnreadCount: 2 }), 2);
  });

  it('does not increment while the recipient is viewing the chat', () => {
    assert.equal(
      applyIncomingUnreadTotal(3, { isActiveVisibleChat: true }),
      3,
    );
  });

  it('does not increment the nav badge for a hidden chat', () => {
    assert.equal(
      applyIncomingUnreadTotal(3, { incrementUnread: false }),
      3,
    );
  });

  it('increments when the recipient is elsewhere', () => {
    assert.equal(applyIncomingUnreadTotal(3, {}), 4);
  });
});

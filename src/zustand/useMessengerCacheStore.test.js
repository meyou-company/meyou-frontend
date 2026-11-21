import { beforeEach, describe, expect, it } from 'vitest';
import { useMessengerCacheStore } from './useMessengerCacheStore';

describe('useMessengerCacheStore', () => {
  beforeEach(() => {
    useMessengerCacheStore.getState().reset();
  });

  it('clears threads when userId changes', () => {
    useMessengerCacheStore.getState().bindUser('user-a');
    useMessengerCacheStore.getState().saveThread('conv-1', {
      messages: [{ id: 'm1', createdAt: '2024-01-01T00:00:00.000Z' }],
      hasMoreOlder: false,
      olderCursor: null,
    });
    expect(useMessengerCacheStore.getState().getThread('conv-1')?.messages).toHaveLength(1);
    useMessengerCacheStore.getState().bindUser('user-b');
    expect(useMessengerCacheStore.getState().getThread('conv-1')).toBeNull();
    expect(useMessengerCacheStore.getState().getInboxSnapshot().conversations).toEqual([]);
  });

  it('updateThreadMessages patches inactive thread', () => {
    useMessengerCacheStore.getState().bindUser('user-a');
    useMessengerCacheStore.getState().saveThread('conv-1', {
      messages: [{ id: 'm1', text: 'hi', createdAt: '2024-01-01T00:00:00.000Z' }],
      hasMoreOlder: false,
      olderCursor: null,
    });
    useMessengerCacheStore.getState().updateThreadMessages('conv-1', (prev) =>
      prev.map((m) => (m.id === 'm1' ? { ...m, text: 'edited' } : m)),
    );
    expect(useMessengerCacheStore.getState().getThread('conv-1')?.messages[0]?.text).toBe(
      'edited',
    );
  });

  it('reset clears everything on logout', () => {
    useMessengerCacheStore.getState().bindUser('user-a');
    useMessengerCacheStore.getState().setInboxSnapshot({
      conversations: [{ id: 'c1' }],
      listHasMore: true,
      listNextCursor: 'x',
    });
    useMessengerCacheStore.getState().reset();
    expect(useMessengerCacheStore.getState().getBoundUserId()).toBeNull();
    expect(useMessengerCacheStore.getState().getInboxSnapshot().conversations).toEqual([]);
  });
});
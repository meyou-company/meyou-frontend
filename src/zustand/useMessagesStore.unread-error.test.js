import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/conversationsApi', () => ({
  conversationsApi: {
    getUnreadCount: vi.fn(),
  },
}));

import { conversationsApi } from '../services/conversationsApi';
import { useMessagesStore } from './useMessagesStore';

describe('useMessagesStore fetchTotalUnreadCount', () => {
  beforeEach(() => {
    useMessagesStore.setState({
      totalUnreadCount: 7,
      totalUnreadFetchStatus: 'ok',
      activeConversationId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    useMessagesStore.getState().reset();
  });

  it('keeps last successful count when the API returns 500', async () => {
    conversationsApi.getUnreadCount.mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 500'), {
        response: { status: 500 },
      }),
    );

    await useMessagesStore.getState().fetchTotalUnreadCount(true);

    const state = useMessagesStore.getState();
    expect(state.totalUnreadCount).toBe(7);
    expect(state.totalUnreadFetchStatus).toBe('error');
  });

  it('updates count after a successful fetch', async () => {
    conversationsApi.getUnreadCount.mockResolvedValueOnce({ count: 3 });

    await useMessagesStore.getState().fetchTotalUnreadCount(true);

    const state = useMessagesStore.getState();
    expect(state.totalUnreadCount).toBe(3);
    expect(state.totalUnreadFetchStatus).toBe('ok');
  });
});
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./giftsApi', () => ({
  giftsApi: {
    getReceived: vi.fn(),
    getSent: vi.fn(),
  },
}));

import { giftsApi } from './giftsApi';
import { fetchAllReceivedGifts } from './giftsPagination';

describe('giftsPagination', () => {
  beforeEach(() => {
    vi.mocked(giftsApi.getReceived).mockReset();
  });

  it('aggregates all received pages via cursor', async () => {
    giftsApi.getReceived
      .mockResolvedValueOnce({
        items: [{ id: 'a' }],
        hasMore: true,
        nextCursor: 'c2',
      })
      .mockResolvedValueOnce({
        items: [{ id: 'b' }],
        hasMore: false,
        nextCursor: null,
      });

    const items = await fetchAllReceivedGifts({ take: 1 });
    expect(items.map((g) => g.id)).toEqual(['a', 'b']);
    expect(giftsApi.getReceived).toHaveBeenCalledTimes(2);
  });
});
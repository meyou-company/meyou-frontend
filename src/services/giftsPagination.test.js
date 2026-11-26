import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./giftsApi', () => ({
  giftsApi: {
    getReceivedPending: vi.fn(),
  },
  normalizeGiftListResponse: (body) => {
    if (Array.isArray(body)) {
      return { items: body, hasMore: false, nextCursor: null };
    }
    return {
      items: Array.isArray(body?.items) ? body.items : [],
      hasMore: Boolean(body?.hasMore),
      nextCursor: body?.nextCursor ?? null,
    };
  },
}));

import { giftsApi, normalizeGiftListResponse } from './giftsApi';
import { fetchPendingReceivedGifts, mergeGiftListItems } from './giftsPagination';

describe('normalizeGiftListResponse', () => {
  it('accepts legacy array responses', () => {
    const page = normalizeGiftListResponse([{ id: 'a' }]);
    expect(page.items).toEqual([{ id: 'a' }]);
    expect(page.hasMore).toBe(false);
  });

  it('accepts paginated envelope', () => {
    const page = normalizeGiftListResponse({
      items: [{ id: 'b' }],
      hasMore: true,
      nextCursor: 'c1',
    });
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('c1');
  });
});

describe('mergeGiftListItems', () => {
  it('deduplicates by gift send id', () => {
    const merged = mergeGiftListItems(
      [{ id: '1' }, { id: '2' }],
      [{ id: '2' }, { id: '3' }],
    );
    expect(merged.map((g) => g.id)).toEqual(['1', '2', '3']);
  });
});

describe('fetchPendingReceivedGifts', () => {
  beforeEach(() => {
    vi.mocked(giftsApi.getReceivedPending).mockReset();
  });

  it('includes PENDING beyond the first history page via pending-only paging', async () => {
    giftsApi.getReceivedPending
      .mockResolvedValueOnce({
        items: [{ id: 'fresh', status: 'PENDING' }],
        hasMore: true,
        nextCursor: 'p2',
      })
      .mockResolvedValueOnce({
        items: [{ id: 'old-pending', status: 'PENDING' }],
        hasMore: false,
        nextCursor: null,
      });

    const items = await fetchPendingReceivedGifts({ take: 1 });

    expect(giftsApi.getReceivedPending).toHaveBeenCalledTimes(2);
    expect(giftsApi.getReceivedPending).not.toHaveBeenCalledWith(
      expect.objectContaining({ paginated: false }),
    );
    expect(items.map((g) => g.id)).toEqual(['fresh', 'old-pending']);
  });
});
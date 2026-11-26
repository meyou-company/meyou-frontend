import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/giftsPagination', () => ({
  fetchPendingReceivedGifts: vi.fn(),
}));

vi.mock('../zustand/useAuthStore', () => ({
  useAuthStore: (selector) =>
    selector({
      isAuthed: true,
      isAuthLoading: false,
      user: { id: 'user-1' },
    }),
}));

const hydratePending = vi.fn();
const pruneOpened = vi.fn();
const clear = vi.fn();

vi.mock('../zustand/useGiftInboxStore', () => ({
  useGiftInboxStore: (selector) =>
    selector({
      hydratePending,
      pruneOpened,
      clear,
    }),
}));

vi.mock('../components/Gifts/GiftBoxOverlay', () => ({
  default: () => null,
}));

import { fetchPendingReceivedGifts } from '../services/giftsPagination';
import { GiftInboxProvider } from './GiftInboxProvider';

describe('GiftInboxProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPendingReceivedGifts.mockResolvedValue([
      { id: 'g1', status: 'PENDING' },
      { id: 'old-pending', status: 'PENDING' },
    ]);
  });

  it('hydrates pending gifts via pending-only API (not general history)', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <GiftInboxProvider />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchPendingReceivedGifts).toHaveBeenCalledTimes(1);
    });
    expect(hydratePending).toHaveBeenCalledWith([
      { id: 'g1', status: 'PENDING' },
      { id: 'old-pending', status: 'PENDING' },
    ]);
  });
});
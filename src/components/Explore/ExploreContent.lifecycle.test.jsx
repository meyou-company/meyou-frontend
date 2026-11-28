import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExploreContent from './ExploreContent';

const meDeferred = vi.fn();
const followingDeferred = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../../services/auth', () => ({
  authApi: { me: (...args) => meDeferred(...args) },
}));

vi.mock('../../services/subscriptionsApi', () => ({
  subscriptionsApi: { getFollowing: (...args) => followingDeferred(...args) },
}));

vi.mock('../../services/usersApi', () => ({
  usersApi: { search: vi.fn(() => Promise.resolve({ data: { users: [] } })) },
}));

vi.mock('../../zustand/usePresenceStore', () => ({
  usePresenceStore: {
    getState: () => ({ hydrateMany: vi.fn() }),
  },
}));

vi.mock('./SearchFilterModal', () => ({
  default: () => null,
}));

describe('ExploreContent lifecycle (015)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meDeferred.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { id: 'me', city: 'Kyiv' } }), 50);
        }),
    );
    followingDeferred.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { items: [{ id: 'u1' }] } }), 50);
        }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('does not throw after unmount when loadCurrentUser resolves late', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <ExploreContent />
      </MemoryRouter>,
    );

    unmount();

    await expect(
      new Promise((r) => setTimeout(r, 80)),
    ).resolves.toBeUndefined();

    expect(meDeferred).toHaveBeenCalledTimes(1);
  });

  it('loads following list on mount', async () => {
    render(
      <MemoryRouter>
        <ExploreContent />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(followingDeferred).toHaveBeenCalledTimes(1);
    });
  });
});
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState = vi.hoisted(() => ({
  user: null,
  isAuthed: false,
  isAuthLoading: true,
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../services/api', () => ({
  clearOAuthSessionTokens: vi.fn(),
}));

vi.mock('../zustand/useAuthStore', () => ({
  useAuthStore: (selector) => {
    if (typeof selector !== 'function') return authState;
    return selector(authState);
  },
}));

import ProfileGuard from './ProfileGuard';

function ProtectedProbe() {
  return <div data-testid="protected-probe">mounted</div>;
}

describe('ProfileGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isAuthed = false;
    authState.isAuthLoading = true;
  });

  it('does not mount protected children while auth is loading', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProfileGuard>
          <ProtectedProbe />
        </ProfileGuard>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('protected-probe')).toBeNull();
  });

  it('does not mount protected children for unauthorized users', async () => {
    authState.isAuthLoading = false;
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProfileGuard>
          <ProtectedProbe />
        </ProfileGuard>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('protected-probe')).toBeNull();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          replace: true,
          state: { redirectTo: '/profile' },
        }),
      );
    });
  });

  it('mounts children for authorized users on allowed routes', () => {
    authState.isAuthLoading = false;
    authState.isAuthed = true;
    authState.user = {
      id: 'u1',
      isVerified: true,
      profileCompleted: true,
      acceptedTerms: true,
    };
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProfileGuard>
          <ProtectedProbe />
        </ProfileGuard>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('protected-probe')).toBeTruthy();
  });
});
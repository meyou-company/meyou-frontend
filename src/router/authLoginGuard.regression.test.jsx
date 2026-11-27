import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileGuard from './ProfileGuard';
import { resolveProfileGuardState } from './profileGuardState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../hooks/useForceDarkTheme', () => ({
  useForceDarkTheme: () => {},
}));

const authState = {
  user: null,
  isAuthed: false,
  isAuthLoading: true,
  login: vi.fn(),
};

vi.mock('../zustand/useAuthStore', () => ({
  useAuthStore: (selector) => {
    if (typeof selector !== 'function') return authState;
    return selector(authState);
  },
}));

vi.mock('../services/api', () => ({
  clearOAuthSessionTokens: vi.fn(),
  resolvedApiBaseUrl: 'http://test',
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import LoginForm from '../components/Auth/Login/LoginForm';

/**
 * Regression: LoginForm never hid the email field (no quick-login / saved-account UI).
 * Production "password only" came from ProfileGuard unmounting /auth/login during init
 * or redirecting authed users off the route (8e2e3c2).
 */
describe('auth login guard regression', () => {
  it('allows LoginForm email+password while auth bootstrap runs on /auth/login', () => {
    const guard = resolveProfileGuardState({
      pathname: '/auth/login',
      isAuthLoading: true,
      isAuthed: false,
      user: null,
    });
    expect(guard.renderChildren).toBe(true);
    expect(guard.phase).toBe('loading-public');

    render(
      <MemoryRouter initialEntries={['/auth/login']}>
        <ProfileGuard>
          <LoginForm />
        </ProfileGuard>
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText('auth.login.emailPlaceholder')).toBeTruthy();
    expect(screen.getByPlaceholderText('auth.login.passwordPlaceholder')).toBeTruthy();
  });
});
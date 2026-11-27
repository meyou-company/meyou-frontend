import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { resolvedLanguage: 'uk', language: 'uk' },
  }),
}));

vi.mock('../../zustand/useLocaleStore', () => ({
  useLocaleStore: (selector) =>
    selector({
      locale: 'uk',
      setLocale: vi.fn(),
      isSaving: false,
    }),
}));

vi.mock('../../hooks/useForceDarkTheme', () => ({
  useForceDarkTheme: () => {},
}));

import HomePage from './HomePage';

describe('HomePage auth entry actions', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('navigates to register without forcing clearSession (pre–nav-guard behavior)', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));
    expect(navigateMock).toHaveBeenCalledWith('/auth/register');
  });

  it('navigates to login without forcing clearSession', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'auth.login.submit' }));
    expect(navigateMock).toHaveBeenCalledWith('/auth/login');
  });
});
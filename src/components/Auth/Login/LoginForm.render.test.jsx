import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('../../../hooks/useForceDarkTheme', () => ({
  useForceDarkTheme: () => {},
}));

vi.mock('../../../zustand/useAuthStore', () => ({
  useAuthStore: (selector) =>
    typeof selector === 'function' ? selector({ login: vi.fn() }) : {},
}));

import LoginForm from './LoginForm';

describe('LoginForm render', () => {
  it('shows email and password inputs for a guest', () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText('auth.login.emailPlaceholder')).toBeTruthy();
    expect(screen.getByPlaceholderText('auth.login.passwordPlaceholder')).toBeTruthy();
  });
});
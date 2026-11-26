import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearOAuthSessionTokens } from '../services/api';
import { useAuthStore } from '../zustand/useAuthStore';
import { resolveProfileGuardState } from './profileGuardState';

export default function ProfileGuard({ children }) {
  const { user, isAuthed, isAuthLoading } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const guard = resolveProfileGuardState({
    pathname,
    isAuthLoading,
    isAuthed,
    user,
  });

  useEffect(() => {
    if (!guard.redirect) return undefined;

    const { to, replace = true, state } = guard.redirect;
    if (to === pathname && !state) return undefined;

    if (guard.phase === 'unauthorized') {
      clearOAuthSessionTokens();
    }

    navigate(to, { replace, ...(state ? { state } : {}) });
    return undefined;
  }, [guard.phase, guard.redirect, navigate, pathname]);

  if (!guard.renderChildren) {
    return null;
  }

  return children;
}
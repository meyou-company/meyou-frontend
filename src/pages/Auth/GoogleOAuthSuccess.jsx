import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { restoreOAuthSession } from '../../services/authSession';
import { useAuthStore } from '../../zustand/useAuthStore';

function postAuthPath(user) {
  const verified =
    user.isVerified === true ||
    user.emailVerified === true ||
    Boolean(user.emailVerifiedAt || user.email_verified);
  if (!verified) return '/auth/verify-email';
  if (user.profileCompleted !== true) return '/users/profile/complete';
  return '/profile';
}

/**
 * Після редіректу з Google: бекенд веде на
 * `/auth/google/success?access_token=…&refresh_token=…` (+ httpOnly cookies на API host).
 */
export default function GoogleOAuthSuccess() {
  const navigate = useNavigate();
  const setAuth = useAuthStore.setState;

  useEffect(() => {
    let cancelled = false;
    setAuth({ isAuthLoading: true });

    (async () => {
      try {
        const user = await restoreOAuthSession(setAuth);
        if (cancelled) return;
        window.history.replaceState({}, document.title, '/auth/google/success');
        navigate(postAuthPath(user), { replace: true });
      } catch (err) {
        console.error('[google oauth] session failed:', err?.response?.data ?? err?.message);
        if (cancelled) return;
        useAuthStore.getState().clearSession();
        navigate('/auth/login', { replace: true });
      } finally {
        if (!cancelled) setAuth({ isAuthLoading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuth]);

  return null;
}

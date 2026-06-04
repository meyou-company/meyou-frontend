import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { restoreOAuthSession } from '../../services/authSession';
import { useAuthStore } from '../../zustand/useAuthStore';

function postAuthPath(user) {
  if (user?.profileCompleted === false) {
    return '/users/profile/complete';
  }
  return '/profile';
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore.setState;

  useEffect(() => {
    let cancelled = false;
    setAuth({ isAuthLoading: true });

    (async () => {
      try {
        const user = await restoreOAuthSession(setAuth);
        if (cancelled) return;
        navigate(postAuthPath(user), { replace: true });
      } catch (err) {
        console.error('[auth callback] session failed:', err?.response?.data ?? err?.message);
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

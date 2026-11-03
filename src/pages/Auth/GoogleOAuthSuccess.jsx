import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { readOAuthQueryError, restoreOAuthSession } from '../../services/authSession';
import { useAuthStore } from '../../zustand/useAuthStore';
import AuthLoadingScreen from '../../components/Auth/AuthLoadingScreen';
import { hasAcceptedTerms } from '../../utils/authTerms';

function postAuthPath(user) {
  const needsTerms = !hasAcceptedTerms(user);
  if (needsTerms) return '/legal/accept-terms';

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
      if (readOAuthQueryError()) {
        useAuthStore.getState().clearSession();
        if (!cancelled) {
          setAuth({ isAuthLoading: false });
          navigate('/auth/login', { replace: true });
        }
        return;
      }
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

  return <AuthLoadingScreen messageKey="auth.google.loading" />;
}

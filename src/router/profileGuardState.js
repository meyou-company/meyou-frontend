import { isPublicPath } from '../constants/publicRoutes';
import { hasAcceptedTerms } from '../utils/authTerms';

/** Public auth screens stay mountable during bootstrap and when a session exists (pre–nav-guard behavior). */
export const PUBLIC_AUTH_FORM_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
]);

const PROFILE_COMPLETE_PATH = '/users/profile/complete';

export function isEmailVerifiedUser(user) {
  if (!user) return false;
  return (
    user.isVerified === true ||
    user.emailVerified === true ||
    user.email_verified === true ||
    Boolean(user.emailVerifiedAt)
  );
}

/**
 * Pure guard decision for unit tests and ProfileGuard.
 * @returns {{ renderChildren: boolean, redirect: null | { to: string, replace?: boolean, state?: object }, phase: string }}
 */
export function resolveProfileGuardState({
  pathname,
  isAuthLoading,
  isAuthed,
  user,
}) {
  const isPublicPage = isPublicPath(pathname);

  if (isAuthLoading) {
    const allowDuringBootstrap =
      isPublicPath(pathname) &&
      (pathname === '/' || PUBLIC_AUTH_FORM_PATHS.has(pathname));
    if (allowDuringBootstrap) {
      return { phase: 'loading-public', renderChildren: true, redirect: null };
    }
    return { phase: 'loading', renderChildren: false, redirect: null };
  }

  if ((!isAuthed || !user) && !isPublicPage) {
    return {
      phase: 'unauthorized',
      renderChildren: false,
      redirect: {
        to: '/auth/login',
        replace: true,
        state: { redirectTo: pathname },
      },
    };
  }

  if (!user) {
    return { phase: 'public-guest', renderChildren: true, redirect: null };
  }

  if (pathname.startsWith('/admin')) {
    return { phase: 'admin', renderChildren: true, redirect: null };
  }

  const isVerified = isEmailVerifiedUser(user);
  const needsTerms = !hasAcceptedTerms(user);
  const isLegalPage = pathname.startsWith('/legal/');
  const isVerifyEmailPage = pathname === '/auth/verify-email';

  if (needsTerms && !isLegalPage) {
    return {
      phase: 'terms',
      renderChildren: false,
      redirect: { to: '/legal/accept-terms', replace: true },
    };
  }

  if (!isVerified && !isVerifyEmailPage && !isPublicPage) {
    return {
      phase: 'verify-email',
      renderChildren: false,
      redirect: { to: '/auth/verify-email', replace: true },
    };
  }

  if (
    isVerified &&
    user.profileCompleted === false &&
    pathname !== PROFILE_COMPLETE_PATH &&
    !isPublicPage
  ) {
    return {
      phase: 'complete-profile',
      renderChildren: false,
      redirect: { to: PROFILE_COMPLETE_PATH, replace: true },
    };
  }

  return { phase: 'ready', renderChildren: true, redirect: null };
}
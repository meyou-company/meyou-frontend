import { hasStoredAuthCredentials } from '../services/api';

/** Public pages: no Socket.IO. */
export const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/auth/google/success',
  '/auth/forgot-password',
  '/auth/reset/verify-code',
  '/auth/reset/new-password',
  '/auth/verify-email',
  '/users/profile/complete',
  '/legal/privacy',
  '/legal/terms',
  '/legal/community-guidelines',
  '/legal/delete-account',
  '/legal/accept-terms',
  '/earn',
  '/features/chat',
  '/features/stories',
  '/features/gifts',
  '/features/profile',
  '/features/security',
];

export function normalizePathname(pathname) {
  const path = String(pathname ?? '').replace(/\/$/, '');
  return path || '/';
}

export function isPublicPath(pathname) {
  const path = normalizePathname(pathname);
  if (PUBLIC_PATHS.includes(path)) return true;
  if (path.startsWith('/legal/')) return true;
  if (path.startsWith('/features/')) return true;
  if (path === '/earn') return true;
  return path.startsWith('/auth/');
}

const OAUTH_CALLBACK_PATHS = new Set(['/auth/google/success', '/auth/callback']);

/** Login/register restore session via login() — not init(). */
const AUTH_FORM_PATHS = new Set(['/auth/login', '/auth/register']);

/**
 * Bootstrap only when sessionStorage has JWT hints and the route needs it.
 * Protected routes without tokens rely on ProfileGuard redirect (no /users/me probe).
 */
export function shouldRunAuthBootstrap(pathname) {
  const path = normalizePathname(
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
  );

  if (OAUTH_CALLBACK_PATHS.has(path)) return false;
  if (AUTH_FORM_PATHS.has(path)) return false;
  if (!hasStoredAuthCredentials()) return false;
  return true;
}

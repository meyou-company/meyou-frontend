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
];

export function normalizePathname(pathname) {
  const path = String(pathname ?? '').replace(/\/$/, '');
  return path || '/';
}

export function isPublicPath(pathname) {
  const path = normalizePathname(pathname);
  if (PUBLIC_PATHS.includes(path)) return true;
  return path.startsWith('/auth/');
}

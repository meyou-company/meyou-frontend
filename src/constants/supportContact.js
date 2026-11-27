/** Public support path (no auth). Blocked users can open About + guidelines without a session. */
export const PUBLIC_SUPPORT_PATH = '/about';
export const PUBLIC_GUIDELINES_PATH = '/legal/community-guidelines';

const rawEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
export const SUPPORT_EMAIL = rawEmail || '';

export function supportMailtoHref(subject = '') {
  if (!SUPPORT_EMAIL) return null;
  const qs = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${SUPPORT_EMAIL}${qs}`;
}
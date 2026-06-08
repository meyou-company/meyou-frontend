import { i18n } from '../i18n';

/** Базовий origin для публічних посилань (не localhost у prod, якщо задано VITE_PUBLIC_APP_URL). */
export function getPublicAppOrigin() {
  const fromEnv =
    import.meta.env.VITE_PUBLIC_APP_URL?.trim() ||
    import.meta.env.VITE_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Публічне посилання на пост для зовнішнього шеру. */
export function buildPostShareUrl(postId) {
  if (!postId) return '';
  const origin = getPublicAppOrigin();
  const path = `/posts/${encodeURIComponent(postId)}`;
  if (!origin) return path;
  return `${origin}${path}`;
}

export function getPostShareText(t = i18n.t.bind(i18n)) {
  return t('posts.share.defaultText');
}

/** @deprecated Use getPostShareText() */
export const POST_SHARE_TEXT = getPostShareText();

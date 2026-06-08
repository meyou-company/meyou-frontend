import { i18n } from '../i18n';

/** Короткий відносний час для постів і коментарів. */
export function formatRelativeTime(iso, t = i18n.t.bind(i18n)) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return t('posts.time.justNow');
    if (diff < 3600_000) {
      return t('posts.time.minutes', { count: Math.floor(diff / 60_000) });
    }
    if (diff < 86_400_000) {
      return t('posts.time.hours', { count: Math.floor(diff / 3600_000) });
    }
    if (diff < 7 * 86_400_000) {
      return t('posts.time.days', { count: Math.floor(diff / 86_400_000) });
    }
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** @deprecated Use formatRelativeTime */
export function formatPostTime(iso, t) {
  return formatRelativeTime(iso, t);
}

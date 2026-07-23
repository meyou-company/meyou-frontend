/**
 * Format last-seen timestamp for UI (relative when recent, otherwise locale date).
 * @param {string|Date|null|undefined} lastSeenAt
 * @param {(key: string, options?: object) => string} t i18n.t
 * @param {string} [locale]
 */
export function formatLastSeenAt(lastSeenAt, t, locale) {
  if (!lastSeenAt) return t('presence.lastSeenUnknown');

  const date = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return t('presence.lastSeenUnknown');

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return t('presence.lastSeenJustNow');
  if (diffMin < 60) return t('presence.lastSeenMinutes', { count: diffMin });
  if (diffHour < 24) return t('presence.lastSeenHours', { count: diffHour });
  if (diffDay < 7) return t('presence.lastSeenDays', { count: diffDay });

  try {
    return t('presence.lastSeenOn', {
      date: date.toLocaleDateString(locale || undefined, {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      }),
    });
  } catch {
    return t('presence.lastSeenOn', { date: date.toISOString().slice(0, 10) });
  }
}

/** Normalize API / store fields into { isOnline, lastSeenAt }. Never defaults missing → online. */
export function normalizePresenceFields(user) {
  if (!user || typeof user !== 'object') {
    return { isOnline: false, lastSeenAt: null };
  }
  const isOnline =
    typeof user.isOnline === 'boolean'
      ? user.isOnline
      : typeof user.online === 'boolean'
        ? user.online
        : false;
  return {
    isOnline,
    lastSeenAt: isOnline ? null : (user.lastSeenAt ?? null),
  };
}

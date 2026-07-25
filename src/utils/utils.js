export function getDayLabel(date, t) {
  const d = new Date(date);
  const now = new Date();

  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return t('notifications.today');
  if (diffDays === 1) return t('notifications.yesterday');

  return t('notifications.earlier');
}

export function formatTime(date, t) {
  const diff = Date.now() - new Date(date).getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return t('notifications.justNow');
  if (minutes < 60) {
    return t('notifications.minutesAgo', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('notifications.hoursAgo', { count: hours });
  }

  const days = Math.floor(hours / 24);

  return t('notifications.daysAgo', { count: days });
}

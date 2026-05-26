export function getDayLabel(date) {
  const d = new Date(date);
  const now = new Date();

  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';

  return 'Раньше';
}

export function formatTime(date) {
  const diff = Date.now() - new Date(date).getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);

  return `${days} дн назад`;
}

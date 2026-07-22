export function formatUserLabel(user) {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (user.username) return `@${user.username}`;
  return name || user.id;
}

export function formatUserSubline(user) {
  if (!user) return '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (user.username && name) return name;
  return user.id;
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function profilePath(user) {
  const handle = user?.username || user?.id;
  return handle ? `/profile/${handle}` : '/profile';
}

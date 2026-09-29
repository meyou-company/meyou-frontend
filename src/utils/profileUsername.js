export function resolveProfileUsername(value, depth = 0) {
  if (depth > 3 || value == null) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim().replace(/^@+/, '');
  }

  if (typeof value !== 'object') return '';

  const candidate =
    value.username ??
    value.userName ??
    value.nick ??
    value.nickname ??
    value.login ??
    value.handle ??
    value.value;

  if (candidate === value) return '';
  return resolveProfileUsername(candidate, depth + 1);
}

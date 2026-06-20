export function normalizePhone(value = '') {
  if (typeof value !== 'string') return '';
  return value.replace(/[^\d+]/g, '');
}

export function getBirthDateLimits() {
  const today = new Date();
  const max = new Date(today);
  max.setFullYear(max.getFullYear() - 18);
  const min = new Date(today.getFullYear() - 100, 0, 1);
  return {
    minStr: min.toISOString().slice(0, 10),
    maxStr: max.toISOString().slice(0, 10),
    minDate: min,
    maxDate: max,
  };
}

export function toYMDLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

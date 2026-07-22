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

function isValidCalendarDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const BIRTH_DATE_MASK_MAX_LENGTH = 10;

/** Format up to 8 digits as DD.MM.YYYY (max 10 chars with dots). */
export function formatBirthDateMaskInput(raw) {
  const digits = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 8);
  if (!digits) return '';

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return digits.length === 2 ? `${day}.` : day;
  }

  if (digits.length <= 4) {
    return digits.length === 4 ? `${day}.${month}.` : `${day}.${month}`;
  }

  return `${day}.${month}.${year}`;
}

/** Apply mask while keeping Backspace natural when removing auto-inserted dots. */
export function applyBirthDateMaskChange(nextRaw, previousDisplay = '') {
  const prevDigits = String(previousDisplay).replace(/\D/g, '');
  let digits = String(nextRaw ?? '')
    .replace(/\D/g, '')
    .slice(0, 8);

  if (digits === prevDigits && String(nextRaw ?? '').length < previousDisplay.length) {
    digits = prevDigits.slice(0, -1);
  }

  return formatBirthDateMaskInput(digits);
}

/** YYYY-MM-DD → DD.MM.YYYY for display. */
export function ymdToDisplayMask(ymd) {
  const normalized = normalizeBirthDateInput(ymd);
  if (!normalized) return '';
  const [y, m, d] = normalized.split('-');
  return `${d}.${m}.${y}`;
}

export { BIRTH_DATE_MASK_MAX_LENGTH };

/** Parse manual input: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY → YYYY-MM-DD or null. */
export function normalizeBirthDateInput(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return isValidCalendarDate(y, m, d) ? toYMDLocal(new Date(y, m - 1, d)) : null;
  }

  match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (match) {
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    return isValidCalendarDate(y, m, d) ? toYMDLocal(new Date(y, m - 1, d)) : null;
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (match) {
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    return isValidCalendarDate(y, m, d) ? toYMDLocal(new Date(y, m - 1, d)) : null;
  }

  return null;
}

/** Safe local Date for react-datepicker `selected` (avoids UTC shift from ISO strings). */
export function birthDateToLocalDate(value) {
  const normalized = normalizeBirthDateInput(value);
  if (!normalized) return null;
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function applyBirthDateNormalization(values) {
  if (!values || typeof values !== 'object') return values;
  const raw = values.birthDate;
  if (typeof raw !== 'string' || !raw.trim()) return values;
  const normalized = normalizeBirthDateInput(raw);
  return {
    ...values,
    birthDate: normalized ?? raw.trim(),
  };
}

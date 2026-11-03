/**
 * Keep in sync with API `src/users/validators/person-name.ts`.
 * Unicode letters/marks plus spaces, hyphens, and apostrophes.
 */
export const PERSON_NAME_MIN_LENGTH = 2;
export const PERSON_NAME_MAX_LENGTH = 32;

const PERSON_NAME_PATTERN =
  /^[\p{L}\p{M}\s'\u2018\u2019\u201B\u02BB\u02BC\u02C8`´\u02B9\u2010-\u2011-]+$/u;

export function normalizePersonName(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

export function isValidPersonName(value, options = {}) {
  if (typeof value !== 'string') {
    return false;
  }

  const name = normalizePersonName(value);
  if (!name) {
    return options.allowEmpty === true;
  }

  if (!PERSON_NAME_PATTERN.test(name)) {
    return false;
  }

  return /\p{L}/u.test(name);
}

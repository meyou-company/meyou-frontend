export const CITY_NAME_MAX_LENGTH = 120;

/**
 * Unicode letters/marks/digits plus punctuation used in real geographic names:
 * hyphens, apostrophes (ASCII and typographic), dots, commas, slashes, parentheses.
 */
const CITY_NAME_PATTERN =
  /^[\p{L}\p{M}\p{N}\s.'’‘‛ʻʼ`´ʹˈ,.\-\/()«»·\u2010-\u2014]+$/u;

export function isValidCityName(value, options = {}) {
  if (typeof value !== 'string') {
    return false;
  }

  const city = value.trim();
  if (!city) {
    return options.allowEmpty === true;
  }

  if (city.length > CITY_NAME_MAX_LENGTH) {
    return false;
  }

  if (!CITY_NAME_PATTERN.test(city)) {
    return false;
  }

  return /\p{L}/u.test(city);
}

export function getCityNameIssue(value, { required = false } = {}) {
  const city = typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  if (!city) {
    return required ? 'cityRequired' : null;
  }

  if (city.length > CITY_NAME_MAX_LENGTH) {
    return 'cityMaxLength';
  }

  if (!isValidCityName(city)) {
    return 'cityInvalid';
  }

  return null;
}

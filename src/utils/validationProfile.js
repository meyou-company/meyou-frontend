import { CITY_NAME_MAX_LENGTH, getCityNameIssue } from './cityName.js';
import { normalizePhone } from './profileFormUtils.js';

const onlyLettersSpaces = (v) => /^[\p{L}\p{M}\s'-]+$/u.test(String(v || '').trim());

const isEmpty = (v) =>
  v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

function req(values, errors, field, code) {
  if (isEmpty(values[field])) {
    errors[field] = code;
  }
}

function validateBirthDate(value, errors) {
  if (!value) return;

  const s = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    errors.birthDate = 'birthDateInvalid';
    return;
  }

  const [y, m, d] = s.split('-').map(Number);

  const date = new Date(y, m - 1, d);

  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    errors.birthDate = 'birthDateInvalid';
    return;
  }

  let age = new Date().getFullYear() - y;
  const hasBirthdayPassed = new Date() >= new Date(y + age, m - 1, d);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  if (age < 18 || age > 100) {
    errors.birthDate = 'birthDateAge';
  }
}

function applySharedRules(values, e) {
  if (values.firstName && !onlyLettersSpaces(values.firstName)) {
    e.firstName = 'firstNameLettersOnly';
  }

  if (values.lastName && !onlyLettersSpaces(values.lastName)) {
    e.lastName = 'lastNameLettersOnly';
  }

  if (values.nationality && !onlyLettersSpaces(values.nationality)) {
    e.nationality = 'nationalityLettersOnly';
  }

  if (values.phone) {
    const digits = normalizePhone(values.phone).replace(/\D/g, '');

    if (digits.length < 8) e.phone = 'phoneTooShort';
    if (digits.length > 16) e.phone = 'phoneTooLong';
  }

  if (values.username) {
    const u = values.username.trim();

    if (u.length < 3) {
      e.username = 'usernameMinLength';
    }
    if (u.length > 10) {
      e.username = 'usernameMaxLength';
    }
    if (!/^[a-zA-Z0-9._]+$/.test(u)) {
      e.username = 'usernameFormat';
    }
  }

  if (values.bio?.length > 500) {
    e.bio = 'bioMaxLength';
  }

  if (values.about?.length > 2000) {
    e.about = 'aboutMaxLength';
  }

  if (!e.city) {
    const cityIssue = getCityNameIssue(values.city, { required: false });
    if (cityIssue) {
      e.city = cityIssue;
    }
  }

  if (values.region) {
    const region = String(values.region).trim();
    if (region.length > CITY_NAME_MAX_LENGTH) {
      e.region = 'regionMaxLength';
    }
  }

  validateBirthDate(values.birthDate, e);

  return e;
}

export function validateCompleteProfile(values) {
  const e = {};

  req(values, e, 'firstName', 'firstNameRequired');
  req(values, e, 'lastName', 'lastNameRequired');
  req(values, e, 'username', 'usernameRequired');
  req(values, e, 'phone', 'phoneRequired');

  req(values, e, 'nationality', 'nationalityRequired');

  req(values, e, 'country', 'countryRequired');
  req(values, e, 'city', 'cityRequired');

  req(values, e, 'gender', 'genderRequired');
  req(values, e, 'birthDate', 'birthDateRequired');

  req(values, e, 'interests', 'interestsRequired');
  req(values, e, 'hobbies', 'hobbiesRequired');

  return applySharedRules(values, e);
}

export function validateEditProfile(values) {
  return applySharedRules(values, {});
}

export function translateValidationErrors(errorCodes, t) {
  const out = {};

  for (const [field, code] of Object.entries(errorCodes || {})) {
    out[field] = t(`profile.editForm.validation.${code}`, {
      defaultValue: code,
    });
  }

  return out;
}

const CITY_API_MESSAGE_TO_CODE = [
  { pattern: /^CITY_NAME_TOO_LONG$/i, code: 'cityMaxLength' },
  { pattern: /^CITY_NAME_INVALID$/i, code: 'cityInvalid' },
  {
    pattern: /название города|назва міста|city name/i,
    code: 'cityInvalid',
  },
];

function collectApiMessages(error) {
  const payload = error?.response?.data ?? error?.data ?? error;
  const collected = [];

  const push = (value) => {
    if (typeof value === 'string' && value.trim()) {
      collected.push(value.trim());
    } else if (Array.isArray(value)) {
      value.forEach(push);
    } else if (value && typeof value === 'object') {
      push(value.message);
      push(value.messages);
      push(value.constraints);
      if (typeof value.property === 'string' && value.constraints) {
        Object.values(value.constraints).forEach(push);
      }
    }
  };

  push(payload?.message);
  push(payload?.details);
  return collected;
}

/**
 * Map API location validation to the matching field only.
 * City errors never land on country/region, and vice versa.
 */
export function locationFieldErrorsFromApi(error) {
  const fieldErrors = {};

  for (const message of collectApiMessages(error)) {
    if (/country|країна|страна/i.test(message) && !/city|місто|город/i.test(message)) {
      fieldErrors.country = 'countryRequired';
      continue;
    }

    if (/region|регіон|регион/i.test(message) && !/city|місто|город/i.test(message)) {
      fieldErrors.region = 'regionMaxLength';
      continue;
    }

    const cityMatch = CITY_API_MESSAGE_TO_CODE.find((item) =>
      item.pattern.test(message),
    );
    if (cityMatch) {
      fieldErrors.city = cityMatch.code;
    }
  }

  return fieldErrors;
}

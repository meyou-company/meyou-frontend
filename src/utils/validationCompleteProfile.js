const onlyLettersSpaces = (v) =>
  /^[\p{L}\p{M}\s'-]+$/u.test(String(v || '').trim());

/** Returns field → i18n key under profile.editForm.validation.* */
export function validateCompleteProfile(values) {
  const e = {};

  const req = (key, code) => {
    const v = values[key];
    if (v === null || v === undefined) return (e[key] = code);
    if (typeof v === 'string' && !v.trim()) return (e[key] = code);
    if (Array.isArray(v) && v.length === 0) return (e[key] = code);
  };

  req('lastName', 'lastNameRequired');
  req('firstName', 'firstNameRequired');
  req('phone', 'phoneRequired');
  req('nationality', 'nationalityRequired');
  req('maritalStatus', 'maritalStatusRequired');
  req('country', 'countryRequired');
  req('city', 'cityRequired');
  req('interests', 'interestsRequired');
  req('hobbies', 'hobbiesRequired');
  req('username', 'usernameRequired');

  if (values.gender !== 'MALE' && values.gender !== 'FEMALE') {
    e.gender = 'genderRequired';
  }

  const birthDate = values.birthDate;
  if (
    birthDate === null ||
    birthDate === undefined ||
    (typeof birthDate === 'string' && !birthDate.trim())
  ) {
    e.birthDate = 'birthDateRequired';
  } else {
    const s = String(birthDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      e.birthDate = 'birthDateFormat';
    } else {
      const [y, m, d] = s.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        e.birthDate = 'birthDateInvalid';
      } else {
        const today = new Date();
        let age = today.getFullYear() - y;
        if (
          new Date(today.getFullYear(), today.getMonth(), today.getDate()) <
          new Date(y + age, m - 1, d)
        ) {
          age -= 1;
        }
        if (age < 18 || age > 100) e.birthDate = 'birthDateAge';
      }
    }
  }

  if (values.firstName && !onlyLettersSpaces(values.firstName)) {
    e.firstName = 'firstNameLettersOnly';
  }
  if (values.lastName && !onlyLettersSpaces(values.lastName)) {
    e.lastName = 'lastNameLettersOnly';
  }
  if (values.nationality && !onlyLettersSpaces(values.nationality)) {
    e.nationality = 'nationalityLettersOnly';
  }

  if (!e.username && values.username) {
    const u = String(values.username).trim();
    if (u.length < 3) e.username = 'usernameMinLength';
    else if (u.length > 10) e.username = 'usernameMaxLength';
    else if (!/^[a-zA-Z0-9._-]+$/.test(u)) {
      e.username = 'usernameFormat';
    }
  }

  if (values.bio && String(values.bio).length > 500) {
    e.bio = 'bioMaxLength';
  }

  if (values.phone) {
    const digits = String(values.phone).replace(/\D/g, '');
    if (digits.length < 8) e.phone = 'phoneTooShort';
    if (digits.length > 16) e.phone = 'phoneTooLong';
  }

  return e;
}

export function translateValidationErrors(errorCodes, t) {
  if (!errorCodes || !t) return errorCodes || {};
  const out = {};
  for (const [field, code] of Object.entries(errorCodes)) {
    out[field] = t(`profile.editForm.validation.${code}`, { defaultValue: code });
  }
  return out;
}

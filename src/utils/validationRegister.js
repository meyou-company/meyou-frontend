const NAME_REGEX = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄ' -]{2,}$/;
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

/** @deprecated Use t('auth.validation.passwordHint') instead */
export const PASSWORD_HINT = '';

/** Returns field → i18n key under auth.validation.* */
export const validateRegister = (form) => {
  const errors = {};

  const firstName = (form.firstName || '').trim();
  const email = (form.email || '').trim();
  const password = form.password || '';
  const confirmPassword = form.confirmPassword || '';
  const acceptPolicy = Boolean(form.acceptPolicy);

  if (!firstName) {
    errors.firstName = 'firstNameRequired';
  } else if (firstName.length < 2) {
    errors.firstName = 'firstNameMin';
  } else if (firstName.length > 32) {
    errors.firstName = 'firstNameMax';
  } else if (!NAME_REGEX.test(firstName)) {
    errors.firstName = 'firstNameFormat';
  }

  if (!email) {
    errors.email = 'emailRequired';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'emailInvalid';
  } else if (email.length > 100) {
    errors.email = 'emailMax';
  }

  if (!password) {
    errors.password = 'passwordRequired';
  } else if (password.length < 8) {
    errors.password = 'passwordMin';
  } else if (password.length > 64) {
    errors.password = 'passwordMax';
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = 'passwordFormat';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'confirmRequired';
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'confirmMismatch';
  }

  if (!acceptPolicy) {
    errors.acceptPolicy = 'acceptPolicy';
  }

  return errors;
};

export function translateRegisterValidation(errorCodes, t) {
  if (!errorCodes || !t) return errorCodes || {};
  const out = {};
  for (const [field, code] of Object.entries(errorCodes)) {
    out[field] = t(`auth.validation.${code}`, { defaultValue: code });
  }
  return out;
}

export const isEmptyErrors = (errors) =>
  !errors || Object.keys(errors).length === 0;

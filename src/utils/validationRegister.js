const NAME_REGEX = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄ' -]{2,}$/;
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// мінімум: 8 символів, 1 літера, 1 цифра
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const validateRegister = (form) => {
  const errors = {};

  const firstName = (form.firstName || "").trim();
  const email = (form.email || "").trim();
  const password = form.password || "";
  const confirmPassword = form.confirmPassword || "";
  const acceptPolicy = Boolean(form.acceptPolicy);

  /* =====================
     First name
     ===================== */
  if (!firstName) {
    errors.firstName = "Введіть імʼя";
  } else if (firstName.length < 2) {
    errors.firstName = "Імʼя має містити мінімум 2 символи";
  } else if (firstName.length > 32) {
    errors.firstName = "Імʼя занадто довге";
  } else if (!NAME_REGEX.test(firstName)) {
    errors.firstName = "Імʼя може містити лише букви, пробіли та дефіс";
  }

  /* =====================
     Email
     ===================== */
  if (!email) {
    errors.email = "Введіть email";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Некоректний email";
  } else if (email.length > 100) {
    errors.email = "Email занадто довгий";
  }

  /* =====================
     Password
     ===================== */
  if (!password) {
    errors.password = "Введіть пароль";
  } else if (password.length < 8) {
    errors.password = "Пароль має містити мінімум 8 символів першу велику літеру хоча б одну малу літеру і цифру";
  } else if (password.length > 64) {
    errors.password = "Пароль занадто довгий";
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = "Пароль має містити першу велику літеру одну малу літеру і цифру";
  }

  /* =====================
     Confirm password
     ===================== */
  if (!confirmPassword) {
    errors.confirmPassword = "Підтвердіть пароль";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Паролі не співпадають";
  }

  /* =====================
     Privacy policy
     ===================== */
  if (!acceptPolicy) {
    errors.acceptPolicy = "Потрібно прийняти умови та політику конфіденційності";
  }

  return errors;
};

/* =====================
   Helpers
   ===================== */
export const isEmptyErrors = (errors) =>
  !errors || Object.keys(errors).length === 0;


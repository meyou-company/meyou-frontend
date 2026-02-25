const NAME_REGEX = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄ' -]{2,}$/;
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// мінімум: 8 символів, цифри, одна мала латинська літера, одна велика латинська літера
export const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

export const PASSWORD_HINT =
  "Пароль має містити цифри, хоча б одну малу латинську літеру (a-z) та одну велику (A-Z), інакше пароль неправильний";

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
    errors.password = "Мінімум 8 символів. Потрібні цифри, одна мала латинська літера (a-z) та одна велика (A-Z), інакше пароль неправильний";
  } else if (password.length > 64) {
    errors.password = "Пароль занадто довгий";
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = "Потрібні цифри, одна мала латинська літера (a-z) та одна велика (A-Z), інакше пароль неправильний";
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


/**
 * Merges auth i18n into all locale JSON files.
 * Run: node scripts/sync-auth-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

const authUk = {
  common: {
    logoAlt: 'Me You logo',
    googleAlt: 'Google',
    showPassword: 'Показати пароль',
    hidePassword: 'Сховати пароль',
    somethingWentWrong: 'Щось пішло не так',
  },
  login: {
    title: 'Вхід',
    emailPlaceholder: 'Введіть Email',
    passwordPlaceholder: 'Введіть пароль',
    submit: 'Увійти',
    submitting: 'Вхід…',
    forgotPassword: 'Забули пароль?',
    toastSuccess: 'Успішний вхід',
    errors: {
      emailRequired: 'Введіть E-mail',
      passwordRequired: 'Введіть пароль',
      loginFailed: 'Помилка входу',
    },
  },
  register: {
    title: 'Реєстрація',
    firstNamePlaceholder: 'Введіть імʼя',
    firstNameHint: 'Введіть ваше імʼя. Імʼя може містити букви, пробіли та цифри.',
    emailPlaceholder: 'Введіть Email',
    emailHint: 'Введіть E-mail',
    passwordPlaceholder: 'Введіть пароль',
    confirmPasswordPlaceholder: 'Повторно введіть пароль',
    confirmPasswordHint: 'Будь ласка, підтвердіть ваш пароль',
    policyText:
      'Натискаючи кнопку «Реєстрація», ви приймаєте Політику конфіденційності та Умови використання.',
    submit: 'Створити акаунт',
    submitting: 'Створення…',
    hasAccount: 'У мене вже є акаунт',
    toastSuccess: 'Реєстрація успішна. Перевірте email для підтвердження.',
    errors: {
      checkForm: 'Перевірте, будь ласка, форму',
      registerFailed: 'Помилка реєстрації',
    },
  },
  forgotPassword: {
    title: 'Зміна пароля',
    emailPlaceholder: 'Введіть Email',
    submit: 'Підтвердити',
    submitting: 'Надсилання…',
    toastSuccess: 'Код відправлено на email',
    errors: {
      emailRequired: 'Введіть E-mail',
      emailInvalid: 'Введіть коректний E-mail',
      sendFailed: 'Помилка надсилання коду. Спробуйте ще раз.',
    },
  },
  resetPassword: {
    title: 'Зміна пароля',
    passwordPlaceholder: 'Введіть новий пароль',
    confirmPasswordPlaceholder: 'Повторіть пароль',
    submit: 'Зберегти',
    submitting: 'Збереження…',
    toastSuccess: 'Пароль змінено',
    errors: {
      passwordRequired: 'Введіть новий пароль',
      confirmRequired: 'Повторіть пароль',
      mismatch: 'Паролі не співпадають',
      saveFailed: 'Помилка. Спробуйте ще раз.',
    },
  },
  verifyEmail: {
    title: 'Верифікація',
    subtitle: 'Код надіслано на email і дійсний 15 хвилин.',
    submit: 'Підтвердити',
    submitting: 'Перевірка…',
    resend: 'Надіслати код повторно',
    resending: 'Надсилання…',
    toastVerified: 'Email підтверджено',
    toastResent: 'Код надіслано повторно',
    errors: {
      incomplete: 'Введіть код повністю',
      verifyFailed: 'Помилка верифікації',
      resendFailed: 'Помилка надсилання коду',
    },
  },
  verifyResetCode: {
    title: 'Зміна пароля',
    subtitle: 'Код надіслано на email і дійсний 15 хвилин.',
    submit: 'Далі',
    submitting: 'Перевірка…',
    resend: 'Надіслати код повторно',
    resending: 'Надсилання…',
    toastVerified: 'Код підтверджено',
    toastResent: 'Код надіслано повторно',
    errors: {
      incomplete: 'Введіть код повністю',
      noEmail: 'Немає email. Поверніться назад і введіть email знову.',
      verifyFailed: 'Помилка верифікації',
      resendFailed: 'Помилка надсилання коду',
    },
  },
  verify: {
    digitAria: 'Цифра {{n}}',
  },
  google: {
    loading: 'Вхід через Google…',
    loadingGeneric: 'Авторизація…',
  },
  validation: {
    firstNameRequired: 'Введіть імʼя',
    firstNameMin: 'Імʼя має містити мінімум 2 символи',
    firstNameMax: 'Імʼя занадто довге',
    firstNameFormat: 'Імʼя може містити лише букви, пробіли та дефіс',
    emailRequired: 'Введіть email',
    emailInvalid: 'Некоректний email',
    emailMax: 'Email занадто довгий',
    passwordRequired: 'Введіть пароль',
    passwordMin: 'Мінімум 8 символів. Потрібні цифри, одна мала латинська літера (a-z) та одна велика (A-Z).',
    passwordMax: 'Пароль занадто довгий',
    passwordFormat: 'Потрібні цифри, одна мала латинська літера (a-z) та одна велика (A-Z).',
    passwordHint:
      'Пароль має містити цифри, хоча б одну малу латинську літеру (a-z) та одну велику (A-Z).',
    confirmRequired: 'Підтвердіть пароль',
    confirmMismatch: 'Паролі не співпадають',
    acceptPolicy: 'Потрібно прийняти умови та політику конфіденційності',
  },
};

const authEn = {
  common: {
    logoAlt: 'Me You logo',
    googleAlt: 'Google',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    somethingWentWrong: 'Something went wrong',
  },
  login: {
    title: 'Sign in',
    emailPlaceholder: 'Enter email',
    passwordPlaceholder: 'Enter password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    forgotPassword: 'Forgot password?',
    toastSuccess: 'Signed in successfully',
    errors: {
      emailRequired: 'Enter your email',
      passwordRequired: 'Enter your password',
      loginFailed: 'Sign-in failed',
    },
  },
  register: {
    title: 'Sign up',
    firstNamePlaceholder: 'Enter your name',
    firstNameHint: 'Enter your name. Name can contain letters, spaces and digits.',
    emailPlaceholder: 'Enter email',
    emailHint: 'Enter your email',
    passwordPlaceholder: 'Enter password',
    confirmPasswordPlaceholder: 'Re-enter password',
    confirmPasswordHint: 'Please confirm your password',
    policyText:
      'By clicking «Sign up», you accept the Privacy Policy and Terms of Use.',
    submit: 'Create account',
    submitting: 'Creating…',
    hasAccount: 'I already have an account',
    toastSuccess: 'Registration successful. Check your email to verify.',
    errors: {
      checkForm: 'Please check the form',
      registerFailed: 'Registration failed',
    },
  },
  forgotPassword: {
    title: 'Reset password',
    emailPlaceholder: 'Enter email',
    submit: 'Confirm',
    submitting: 'Sending…',
    toastSuccess: 'Code sent to your email',
    errors: {
      emailRequired: 'Enter your email',
      emailInvalid: 'Enter a valid email',
      sendFailed: 'Failed to send code. Please try again.',
    },
  },
  resetPassword: {
    title: 'Reset password',
    passwordPlaceholder: 'Enter new password',
    confirmPasswordPlaceholder: 'Re-enter password',
    submit: 'Save',
    submitting: 'Saving…',
    toastSuccess: 'Password changed',
    errors: {
      passwordRequired: 'Enter new password',
      confirmRequired: 'Re-enter password',
      mismatch: 'Passwords do not match',
      saveFailed: 'Error. Please try again.',
    },
  },
  verifyEmail: {
    title: 'Verification',
    subtitle: 'Code sent to your email. Valid for 15 minutes.',
    submit: 'Confirm',
    submitting: 'Verifying…',
    resend: 'Resend code',
    resending: 'Sending…',
    toastVerified: 'Email verified',
    toastResent: 'Code resent',
    errors: {
      incomplete: 'Enter the full code',
      verifyFailed: 'Verification failed',
      resendFailed: 'Failed to send code',
    },
  },
  verifyResetCode: {
    title: 'Reset password',
    subtitle: 'Code sent to your email. Valid for 15 minutes.',
    submit: 'Next',
    submitting: 'Verifying…',
    resend: 'Resend code',
    resending: 'Sending…',
    toastVerified: 'Code confirmed',
    toastResent: 'Code resent',
    errors: {
      incomplete: 'Enter the full code',
      noEmail: 'No email. Go back and enter your email again.',
      verifyFailed: 'Verification failed',
      resendFailed: 'Failed to send code',
    },
  },
  verify: {
    digitAria: 'Digit {{n}}',
  },
  google: {
    loading: 'Signing in with Google…',
    loadingGeneric: 'Authorizing…',
  },
  validation: {
    firstNameRequired: 'Enter your name',
    firstNameMin: 'Name must be at least 2 characters',
    firstNameMax: 'Name is too long',
    firstNameFormat: 'Name can only contain letters, spaces and hyphens',
    emailRequired: 'Enter your email',
    emailInvalid: 'Invalid email',
    emailMax: 'Email is too long',
    passwordRequired: 'Enter your password',
    passwordMin: 'Minimum 8 characters. Needs digits, one lowercase (a-z) and one uppercase (A-Z) letter.',
    passwordMax: 'Password is too long',
    passwordFormat: 'Needs digits, one lowercase (a-z) and one uppercase (A-Z) letter.',
    passwordHint:
      'Password must contain digits, at least one lowercase (a-z) and one uppercase (A-Z) letter.',
    confirmRequired: 'Confirm your password',
    confirmMismatch: 'Passwords do not match',
    acceptPolicy: 'You must accept the terms and privacy policy',
  },
};

const authRu = {
  common: {
    logoAlt: 'Me You logo',
    googleAlt: 'Google',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    somethingWentWrong: 'Что-то пошло не так',
  },
  login: {
    title: 'Вход',
    emailPlaceholder: 'Введите Email',
    passwordPlaceholder: 'Введите пароль',
    submit: 'Войти',
    submitting: 'Вход…',
    forgotPassword: 'Забыли пароль?',
    toastSuccess: 'Успешный вход',
    errors: {
      emailRequired: 'Введите E-mail',
      passwordRequired: 'Введите пароль',
      loginFailed: 'Ошибка входа',
    },
  },
  register: {
    title: 'Регистрация',
    firstNamePlaceholder: 'Введите имя',
    firstNameHint: 'Введите ваше имя. Имя может содержать буквы, пробелы и цифры.',
    emailPlaceholder: 'Введите Email',
    emailHint: 'Введите E-mail',
    passwordPlaceholder: 'Введите пароль',
    confirmPasswordPlaceholder: 'Повторно введите пароль',
    confirmPasswordHint: 'Пожалуйста, подтвердите ваш пароль',
    policyText:
      'Нажимая кнопку «Регистрация», вы принимаете Политику конфиденциальности и Условия использования.',
    submit: 'Создать аккаунт',
    submitting: 'Создание…',
    hasAccount: 'У меня есть аккаунт',
    toastSuccess: 'Регистрация успешна. Проверьте email для подтверждения.',
    errors: {
      checkForm: 'Пожалуйста, проверьте форму',
      registerFailed: 'Ошибка регистрации',
    },
  },
  forgotPassword: {
    title: 'Смена пароля',
    emailPlaceholder: 'Введите Email',
    submit: 'Подтвердить',
    submitting: 'Отправка…',
    toastSuccess: 'Код отправлен на email',
    errors: {
      emailRequired: 'Введите E-mail',
      emailInvalid: 'Введите корректный E-mail',
      sendFailed: 'Ошибка отправки кода. Попробуйте ещё раз.',
    },
  },
  resetPassword: {
    title: 'Смена пароля',
    passwordPlaceholder: 'Введите новый пароль',
    confirmPasswordPlaceholder: 'Повторите пароль',
    submit: 'Сохранить',
    submitting: 'Сохранение…',
    toastSuccess: 'Пароль изменён',
    errors: {
      passwordRequired: 'Введите новый пароль',
      confirmRequired: 'Повторите пароль',
      mismatch: 'Пароли не совпадают',
      saveFailed: 'Ошибка. Попробуйте ещё раз.',
    },
  },
  verifyEmail: {
    title: 'Верификация',
    subtitle: 'Код отправлен на email и действителен 15 минут.',
    submit: 'Подтвердить',
    submitting: 'Проверка…',
    resend: 'Отправить код повторно',
    resending: 'Отправка…',
    toastVerified: 'Email подтверждён',
    toastResent: 'Код отправлен повторно',
    errors: {
      incomplete: 'Введите код полностью',
      verifyFailed: 'Ошибка верификации',
      resendFailed: 'Ошибка отправки кода',
    },
  },
  verifyResetCode: {
    title: 'Смена пароля',
    subtitle: 'Код отправлен на email и действителен 15 минут.',
    submit: 'Далее',
    submitting: 'Проверка…',
    resend: 'Отправить код повторно',
    resending: 'Отправка…',
    toastVerified: 'Код подтверждён',
    toastResent: 'Код отправлен повторно',
    errors: {
      incomplete: 'Введите код полностью',
      noEmail: 'Нет email. Вернитесь назад и введите email заново.',
      verifyFailed: 'Ошибка верификации',
      resendFailed: 'Ошибка отправки кода',
    },
  },
  verify: {
    digitAria: 'Цифра {{n}}',
  },
  google: {
    loading: 'Вход через Google…',
    loadingGeneric: 'Авторизация…',
  },
  validation: {
    firstNameRequired: 'Введите имя',
    firstNameMin: 'Имя должно содержать минимум 2 символа',
    firstNameMax: 'Имя слишком длинное',
    firstNameFormat: 'Имя может содержать только буквы, пробелы и дефис',
    emailRequired: 'Введите email',
    emailInvalid: 'Некорректный email',
    emailMax: 'Email слишком длинный',
    passwordRequired: 'Введите пароль',
    passwordMin: 'Минимум 8 символов. Нужны цифры, одна строчная (a-z) и одна заглавная (A-Z) буква.',
    passwordMax: 'Пароль слишком длинный',
    passwordFormat: 'Нужны цифры, одна строчная (a-z) и одна заглавная (A-Z) буква.',
    passwordHint:
      'Пароль должен содержать цифры, хотя бы одну строчную (a-z) и одну заглавную (A-Z) букву.',
    confirmRequired: 'Подтвердите пароль',
    confirmMismatch: 'Пароли не совпадают',
    acceptPolicy: 'Необходимо принять условия и политику конфиденциальности',
  },
};

const localeOverrides = {
  uk: authUk,
  en: authEn,
  ru: authRu,
  tr: authEn,
  fr: authEn,
  cs: authEn,
  es: authEn,
  ar: authEn,
};

for (const locale of Object.keys(localeOverrides)) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  existing.auth = { ...existing.auth, ...localeOverrides[locale] };
  fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log('updated', locale);
}

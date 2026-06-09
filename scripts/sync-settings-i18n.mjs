/**
 * Merges settings + menu i18n into all locale JSON files.
 * Run: node scripts/sync-settings-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

const menuUk = {
  myProfile: 'Мій профіль',
  edit: 'Редагувати',
  viewAsGuest: 'Переглянути як гість',
  darkTheme: 'Темна тема',
  favorites: 'Обране',
  blocked: 'Заблоковані',
  privacy: 'Конфіденційність',
  accountSettings: 'Налаштування акаунта',
  security: 'Безпека',
  support: 'Допомога / Підтримка',
  report: 'Поскаржитись',
  about: 'Про сервіс',
  terms: 'Умови використання',
  privacyPolicy: 'Політика конфіденційності',
  logout: 'Вийти',
  closeMenu: 'Закрити меню',
  language: 'Мова',
};

const menuEn = {
  myProfile: 'My profile',
  edit: 'Edit',
  viewAsGuest: 'View as guest',
  darkTheme: 'Dark theme',
  favorites: 'Favorites',
  blocked: 'Blocked',
  privacy: 'Privacy',
  accountSettings: 'Account settings',
  security: 'Security',
  support: 'Help / Support',
  report: 'Report',
  about: 'About',
  terms: 'Terms of use',
  privacyPolicy: 'Privacy policy',
  logout: 'Log out',
  closeMenu: 'Close menu',
  language: 'Language',
};

const menuRu = {
  myProfile: 'Мой профиль',
  edit: 'Редактировать',
  viewAsGuest: 'Посмотреть как гость',
  darkTheme: 'Тёмная тема',
  favorites: 'Избранное',
  blocked: 'Заблокированные',
  privacy: 'Конфиденциальность',
  accountSettings: 'Настройки аккаунта',
  security: 'Безопасность',
  support: 'Помощь / Поддержка',
  report: 'Пожаловаться',
  about: 'О сервисе',
  terms: 'Условия использования',
  privacyPolicy: 'Политика конфиденциальности',
  logout: 'Выйти',
  closeMenu: 'Закрыть меню',
  language: 'Язык',
};

const settingsUk = {
  languageTitle: 'Мова',
  languageSubtitle: 'Оберіть мову інтерфейсу',
  languageSaved: 'Мову збережено',
  languageSaveError: 'Не вдалося зберегти мову',
  languages: {
    uk: 'Українська',
    en: 'English',
    tr: 'Türkçe',
    fr: 'Français',
    cs: 'Čeština',
    es: 'Español',
    ru: 'Русский',
    ar: 'العربية',
  },
  account: {
    title: 'Налаштування акаунта',
    subtitle: 'Керуйте мовою, паролем і конфіденційністю',
    emailLabel: 'Email',
    items: {
      language: 'Мова інтерфейсу',
      changePassword: 'Змінити пароль',
      privacy: 'Конфіденційність',
      security: 'Безпека',
    },
    itemDesc: {
      language: 'Мова додатку та сповіщень',
      changePassword: 'Оновити пароль для входу',
      privacy: 'Хто бачить ваш профіль і активність',
      security: 'Пароль, сесії та захист акаунта',
    },
  },
  changePassword: {
    title: 'Змінити пароль',
    subtitle: 'Ми надішлемо код підтвердження на ваш email',
    emailLabel: 'Email',
    emailHint: 'Код буде надіслано на цю адресу',
    submit: 'Надіслати код',
    submitting: 'Надсилання…',
    toastSent: 'Код відправлено на email',
    backToAccount: 'Назад до налаштувань',
    errors: {
      emailRequired: 'Введіть E-mail',
      emailInvalid: 'Введіть коректний E-mail',
      sendFailed: 'Помилка надсилання коду. Спробуйте ще раз.',
    },
  },
  privacy: {
    title: 'Конфіденційність',
    subtitle: 'Керуйте тим, хто бачить вашу інформацію',
    saved: 'Налаштування збережено',
    saveError: 'Не вдалося зберегти налаштування',
    loading: 'Завантаження…',
    items: {
      profilePublic: {
        title: 'Публічний профіль',
        desc: 'Інші користувачі можуть переглядати ваш профіль',
      },
      showOnline: {
        title: 'Статус онлайн',
        desc: 'Показувати, коли ви в мережі',
      },
      allowMessages: {
        title: 'Повідомлення',
        desc: 'Дозволити повідомлення від людей, на яких ви не підписані',
      },
      searchVisible: {
        title: 'Пошук',
        desc: 'Показувати профіль у результатах пошуку',
      },
    },
  },
  security: {
    title: 'Безпека',
    subtitle: 'Захист вашого акаунта',
    items: {
      changePassword: {
        title: 'Змінити пароль',
        desc: 'Оновити пароль через email-код',
      },
      twoFactor: {
        title: 'Двофакторна автентифікація',
        desc: 'Додатковий захист при вході',
        comingSoon: 'Незабаром',
      },
      sessions: {
        title: 'Активні сесії',
        desc: 'Пристрої, з яких виконано вхід',
      },
    },
    logoutAll: 'Вийти на всіх пристроях',
    logoutAllConfirm: 'Вийти з акаунта на цьому пристрої?',
    logoutAllSuccess: 'Ви вийшли з акаунта',
    comingSoon: 'Незабаром',
  },
};

const settingsEn = {
  languageTitle: 'Language',
  languageSubtitle: 'Choose interface language',
  languageSaved: 'Language saved',
  languageSaveError: 'Could not save language',
  languages: {
    uk: 'Українська',
    en: 'English',
    tr: 'Türkçe',
    fr: 'Français',
    cs: 'Čeština',
    es: 'Español',
    ru: 'Русский',
    ar: 'العربية',
  },
  account: {
    title: 'Account settings',
    subtitle: 'Manage language, password and privacy',
    emailLabel: 'Email',
    items: {
      language: 'Interface language',
      changePassword: 'Change password',
      privacy: 'Privacy',
      security: 'Security',
    },
    itemDesc: {
      language: 'App and notification language',
      changePassword: 'Update your sign-in password',
      privacy: 'Who can see your profile and activity',
      security: 'Password, sessions and account protection',
    },
  },
  changePassword: {
    title: 'Change password',
    subtitle: 'We will send a verification code to your email',
    emailLabel: 'Email',
    emailHint: 'The code will be sent to this address',
    submit: 'Send code',
    submitting: 'Sending…',
    toastSent: 'Code sent to your email',
    backToAccount: 'Back to settings',
    errors: {
      emailRequired: 'Enter your email',
      emailInvalid: 'Enter a valid email',
      sendFailed: 'Could not send code. Please try again.',
    },
  },
  privacy: {
    title: 'Privacy',
    subtitle: 'Control who can see your information',
    saved: 'Settings saved',
    saveError: 'Could not save settings',
    loading: 'Loading…',
    items: {
      profilePublic: {
        title: 'Public profile',
        desc: 'Other users can view your profile',
      },
      showOnline: {
        title: 'Online status',
        desc: 'Show when you are online',
      },
      allowMessages: {
        title: 'Messages',
        desc: 'Allow messages from people you do not follow',
      },
      searchVisible: {
        title: 'Search',
        desc: 'Show profile in search results',
      },
    },
  },
  security: {
    title: 'Security',
    subtitle: 'Protect your account',
    items: {
      changePassword: {
        title: 'Change password',
        desc: 'Update password via email code',
      },
      twoFactor: {
        title: 'Two-factor authentication',
        desc: 'Extra protection when signing in',
        comingSoon: 'Coming soon',
      },
      sessions: {
        title: 'Active sessions',
        desc: 'Devices where you are signed in',
      },
    },
    logoutAll: 'Log out on all devices',
    logoutAllConfirm: 'Log out of your account on this device?',
    logoutAllSuccess: 'You have been logged out',
    comingSoon: 'Coming soon',
  },
};

const settingsRu = {
  languageTitle: 'Язык',
  languageSubtitle: 'Выберите язык интерфейса',
  languageSaved: 'Язык сохранён',
  languageSaveError: 'Не удалось сохранить язык',
  languages: {
    uk: 'Українська',
    en: 'English',
    tr: 'Türkçe',
    fr: 'Français',
    cs: 'Čeština',
    es: 'Español',
    ru: 'Русский',
    ar: 'العربية',
  },
  account: {
    title: 'Настройки аккаунта',
    subtitle: 'Управляйте языком, паролем и конфиденциальностью',
    emailLabel: 'Email',
    items: {
      language: 'Язык интерфейса',
      changePassword: 'Сменить пароль',
      privacy: 'Конфиденциальность',
      security: 'Безопасность',
    },
    itemDesc: {
      language: 'Язык приложения и уведомлений',
      changePassword: 'Обновить пароль для входа',
      privacy: 'Кто видит ваш профиль и активность',
      security: 'Пароль, сессии и защита аккаунта',
    },
  },
  changePassword: {
    title: 'Сменить пароль',
    subtitle: 'Мы отправим код подтверждения на ваш email',
    emailLabel: 'Email',
    emailHint: 'Код будет отправлен на этот адрес',
    submit: 'Отправить код',
    submitting: 'Отправка…',
    toastSent: 'Код отправлен на email',
    backToAccount: 'Назад к настройкам',
    errors: {
      emailRequired: 'Введите email',
      emailInvalid: 'Введите корректный email',
      sendFailed: 'Ошибка отправки кода. Попробуйте ещё раз.',
    },
  },
  privacy: {
    title: 'Конфиденциальность',
    subtitle: 'Управляйте тем, кто видит вашу информацию',
    saved: 'Настройки сохранены',
    saveError: 'Не удалось сохранить настройки',
    loading: 'Загрузка…',
    items: {
      profilePublic: {
        title: 'Публичный профиль',
        desc: 'Другие пользователи могут просматривать ваш профиль',
      },
      showOnline: {
        title: 'Статус онлайн',
        desc: 'Показывать, когда вы в сети',
      },
      allowMessages: {
        title: 'Сообщения',
        desc: 'Разрешить сообщения от людей, на которых вы не подписаны',
      },
      searchVisible: {
        title: 'Поиск',
        desc: 'Показывать профиль в результатах поиска',
      },
    },
  },
  security: {
    title: 'Безопасность',
    subtitle: 'Защита вашего аккаунта',
    items: {
      changePassword: {
        title: 'Сменить пароль',
        desc: 'Обновить пароль через email-код',
      },
      twoFactor: {
        title: 'Двухфакторная аутентификация',
        desc: 'Дополнительная защита при входе',
        comingSoon: 'Скоро',
      },
      sessions: {
        title: 'Активные сессии',
        desc: 'Устройства, с которых выполнен вход',
      },
    },
    logoutAll: 'Выйти на всех устройствах',
    logoutAllConfirm: 'Выйти из аккаунта на этом устройстве?',
    logoutAllSuccess: 'Вы вышли из аккаунта',
    comingSoon: 'Скоро',
  },
};

const localeOverrides = {
  uk: { menu: menuUk, settings: settingsUk },
  en: { menu: menuEn, settings: settingsEn },
  ru: { menu: menuRu, settings: settingsRu },
  tr: { menu: menuEn, settings: settingsEn },
  fr: { menu: menuEn, settings: settingsEn },
  cs: { menu: menuEn, settings: settingsEn },
  es: { menu: menuEn, settings: settingsEn },
  ar: { menu: menuEn, settings: settingsEn },
};

for (const locale of Object.keys(localeOverrides)) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const block = localeOverrides[locale];
  existing.menu = { ...existing.menu, ...block.menu };
  existing.settings = { ...existing.settings, ...block.settings };
  fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log('updated', locale);
}

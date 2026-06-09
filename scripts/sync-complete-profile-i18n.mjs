/**
 * Merges profile.completeForm i18n into all locale JSON files.
 * Run: node scripts/sync-complete-profile-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

const completeFormUk = {
  title: 'Профіль',
  addPhoto: 'Додати фото профіля',
  photoNote: '*профілі з фото отримають більше переглядів',
  save: 'Зберегти',
  update: 'Оновити',
  saving: 'Збереження...',
  maxLimit: 'Максимум {{max}}',
  toast: {
    profileSaved: 'Профіль збережено',
  },
  errors: {
    saveError: 'Помилка збереження профілю',
  },
};

const completeFormEn = {
  title: 'Profile',
  addPhoto: 'Add profile photo',
  photoNote: '*profiles with photos get more views',
  save: 'Save',
  update: 'Update',
  saving: 'Saving...',
  maxLimit: 'Maximum {{max}}',
  toast: {
    profileSaved: 'Profile saved',
  },
  errors: {
    saveError: 'Failed to save profile',
  },
};

const completeFormRu = {
  title: 'Профиль',
  addPhoto: 'Добавить фото профиля',
  photoNote: '*профили с фото получают больше просмотров',
  save: 'Сохранить',
  update: 'Обновить',
  saving: 'Сохранение...',
  maxLimit: 'Максимум {{max}}',
  toast: {
    profileSaved: 'Профиль сохранён',
  },
  errors: {
    saveError: 'Ошибка сохранения профиля',
  },
};

const localeOverrides = {
  uk: completeFormUk,
  en: completeFormEn,
  ru: completeFormRu,
  tr: completeFormEn,
  fr: completeFormEn,
  cs: completeFormEn,
  es: completeFormEn,
  ar: completeFormEn,
};

for (const locale of Object.keys(localeOverrides)) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  existing.profile = existing.profile || {};
  existing.profile.completeForm = {
    ...existing.profile.completeForm,
    ...localeOverrides[locale],
  };
  fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log('updated', locale);
}

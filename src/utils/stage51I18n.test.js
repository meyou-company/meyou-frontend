import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../i18n/locales');
const locales = ['en', 'uk', 'ru', 'fr', 'es', 'cs', 'tr', 'ar'];

const aboutSections = [
  'what',
  'mission',
  'social',
  'posts',
  'stories',
  'chats',
  'calls',
  'live',
  'luna',
  'community',
  'privacy',
];

const adminUserKeys = [
  'subtitle',
  'searchPlaceholder',
  'relatedReports',
  'openReport',
  'viewAllFeedback',
  'actions.warn',
  'stats.total',
  'accountStatus.ACTIVE',
];

function loadLocale(code) {
  return JSON.parse(readFileSync(join(localesDir, `${code}.json`), 'utf8'));
}

function get(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

describe('stage 5.1 i18n completeness', () => {
  for (const code of locales) {
    it(`locale ${code} has about sections and admin.users keys`, () => {
      const data = loadLocale(code);
      for (const section of aboutSections) {
        const title = get(data, `about.sections.${section}.title`);
        const body = get(data, `about.sections.${section}.body`);
        assert.ok(title?.trim(), `${code} about.${section}.title`);
        assert.ok(body?.trim(), `${code} about.${section}.body`);
        if (code !== 'en') {
          const enBody = get(loadLocale('en'), `about.sections.${section}.body`);
          assert.notEqual(
            body,
            enBody,
            `${code} about.${section}.body must not equal English placeholder`,
          );
        }
      }
      for (const key of adminUserKeys) {
        const value = get(data, `admin.users.${key}`);
        assert.ok(value?.trim?.() || typeof value === 'string', `${code} admin.users.${key}`);
      }
      assert.ok(get(data, 'feedback.types.violation')?.trim());
      assert.ok(get(data, 'errors.ACCOUNT_SUSPENDED_TEMP')?.trim());
      assert.ok(get(data, 'errors.ACCOUNT_SUSPENDED_INDEFINITE')?.trim());
      assert.ok(get(data, 'errors.ACCOUNT_SUSPENDED_SUPPORT')?.trim());
    });
  }

  it('arabic locale file exists in i18n bundle', () => {
    const data = loadLocale('ar');
    assert.ok(data.about?.title?.trim());
  });
});
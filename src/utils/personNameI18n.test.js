import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../i18n/locales');
const files = ['en', 'uk', 'ru', 'fr', 'es', 'tr', 'cs', 'ar'];

describe('person name validation copy', () => {
  it('has Unicode-aware name errors in all locales', () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), 'utf8'));
      const hint = json.auth.register.firstNameHint;
      const format = json.auth.validation.firstNameFormat;
      const first = json.profile.editForm.validation.firstNameLettersOnly;
      const last = json.profile.editForm.validation.lastNameLettersOnly;
      assert.ok(json.profile.editForm.validation.firstNameMin, name);
      assert.ok(json.profile.editForm.validation.firstNameMax, name);
      assert.ok(json.profile.editForm.validation.lastNameMin, name);
      assert.ok(json.profile.editForm.validation.lastNameMax, name);
      const api = json.errors.PERSON_NAME_INVALID;

      assert.ok(hint.length > 10, name);
      assert.doesNotMatch(hint, /digit|цифр/i, name);
      assert.ok(format.length > 10, name);
      assert.ok(first.length > 10, name);
      assert.ok(last.length > 10, name);
      assert.ok(api.length > 8, name);
      assert.doesNotMatch(format, /a-zA-Z|а-яА-Я/, name);
      assert.doesNotMatch(first, /a-zA-Z|а-яА-Я/, name);
    }
  });
});

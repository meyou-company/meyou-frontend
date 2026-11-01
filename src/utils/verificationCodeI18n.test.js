import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../i18n/locales');
const files = ['en', 'uk', 'ru', 'fr', 'es', 'tr', 'cs', 'ar'];

describe('verification code copy', () => {
  it('does not hardcode a code lifetime on the verify screens', () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), 'utf8'));
      assert.doesNotMatch(json.auth.verifyEmail.subtitle, /\{\{minutes\}\}|30|15/, name);
      assert.doesNotMatch(json.auth.verifyResetCode.subtitle, /\{\{minutes\}\}|30|15/, name);
    }
  });

  it('has iCloud, cooldown, and structured error keys in all locales', () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), 'utf8'));
      assert.ok(json.auth.verifyEmail.subtitle.length > 20, name);
      assert.ok(json.auth.verifyResetCode.subtitle.length > 20, name);
      assert.ok(json.auth.verify.resendIn.includes('{{seconds}}'), name);
      assert.ok(json.auth.icloudDeliveryHint.includes('iCloud'), name);
      assert.ok(json.errors.INVALID_VERIFICATION_CODE);
      assert.ok(json.errors.VERIFICATION_CODE_EXPIRED);
      assert.ok(json.errors.VERIFICATION_ATTEMPTS_EXCEEDED);
      assert.match(json.errors.VERIFICATION_RESEND_COOLDOWN, /\{\{seconds\}\}/, name);
    }
  });
});

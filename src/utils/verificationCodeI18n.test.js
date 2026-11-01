import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { VERIFICATION_CODE_EXPIRY_MINUTES } from '../constants/verificationCode.js';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../i18n/locales');
const files = ['en', 'uk', 'ru', 'fr', 'es', 'tr', 'cs', 'ar'];

describe('verification code copy', () => {
  it('keeps the frontend expiry display in sync with 30 minutes', () => {
    assert.equal(VERIFICATION_CODE_EXPIRY_MINUTES, 30);
  });

  it('has iCloud, cooldown, and structured error keys in all locales', () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), 'utf8'));
      assert.match(json.auth.verifyEmail.subtitle, /\{\{minutes\}\}/, name);
      assert.match(json.auth.verifyResetCode.subtitle, /\{\{minutes\}\}/, name);
      assert.ok(json.auth.verify.resendIn.includes('{{seconds}}'), name);
      assert.ok(json.auth.icloudDeliveryHint.includes('iCloud'), name);
      assert.ok(json.errors.INVALID_VERIFICATION_CODE);
      assert.ok(json.errors.VERIFICATION_CODE_EXPIRED);
      assert.ok(json.errors.VERIFICATION_ATTEMPTS_EXCEEDED);
      assert.match(json.errors.VERIFICATION_RESEND_COOLDOWN, /\{\{seconds\}\}/, name);
    }
  });
});

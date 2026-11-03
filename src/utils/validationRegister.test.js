import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateRegister } from './validationRegister.js';

function registerForm(overrides = {}) {
  return {
    firstName: 'Anna',
    email: 'anna@example.com',
    password: 'Secret123',
    confirmPassword: 'Secret123',
    acceptPolicy: true,
    ...overrides,
  };
}

describe('validateRegister firstName', () => {
  it('accepts international given names', () => {
    for (const firstName of [
      'Anička',
      'Jiří',
      'François',
      'Олександра',
      'محمد',
    ]) {
      const errors = validateRegister(registerForm({ firstName }));
      assert.equal(errors.firstName, undefined, firstName);
    }
  });

  it('accepts combining-mark input', () => {
    const errors = validateRegister(
      registerForm({ firstName: `Ani${'c\u030C'}ka` }),
    );
    assert.equal(errors.firstName, undefined);
  });

  it('accepts ASCII and typographic apostrophes', () => {
    assert.equal(
      validateRegister(registerForm({ firstName: "O'Connor" })).firstName,
      undefined,
    );
    assert.equal(
      validateRegister(registerForm({ firstName: 'O\u2019Connor' })).firstName,
      undefined,
    );
  });

  it('uses the shared 2–32 length rule', () => {
    assert.equal(
      validateRegister(registerForm({ firstName: 'A' })).firstName,
      'firstNameMin',
    );
    assert.equal(
      validateRegister(registerForm({ firstName: 'An' })).firstName,
      undefined,
    );
    assert.equal(
      validateRegister(registerForm({ firstName: 'A'.repeat(32) })).firstName,
      undefined,
    );
    assert.equal(
      validateRegister(registerForm({ firstName: 'A'.repeat(33) })).firstName,
      'firstNameMax',
    );
  });

  it('rejects HTML, digits, and control characters', () => {
    assert.equal(
      validateRegister(registerForm({ firstName: '<b>Anna</b>' })).firstName,
      'firstNameFormat',
    );
    assert.equal(
      validateRegister(registerForm({ firstName: 'Anička1' })).firstName,
      'firstNameFormat',
    );
  });
});

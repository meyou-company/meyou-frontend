import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isIcloudMailbox } from './icloudEmail.js';

describe('isIcloudMailbox', () => {
  it('detects Apple mail domains only', () => {
    assert.equal(isIcloudMailbox('user@icloud.com'), true);
    assert.equal(isIcloudMailbox('User@ME.com'), true);
    assert.equal(isIcloudMailbox('name@mac.com'), true);
  });

  it('does not show the hint for Gmail or other providers', () => {
    assert.equal(isIcloudMailbox('user@gmail.com'), false);
    assert.equal(isIcloudMailbox('user@googlemail.com'), false);
    assert.equal(isIcloudMailbox('user@yahoo.com'), false);
    assert.equal(isIcloudMailbox('icloud.com'), false);
    assert.equal(isIcloudMailbox(''), false);
  });
});

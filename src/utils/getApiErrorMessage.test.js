import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import { initI18n } from '../i18n/index.js';
import {
  getApiErrorCode,
  getApiErrorMessage,
  getRetryAfterSeconds,
} from './getApiErrorMessage.js';
import { createCloudinaryUploadError } from './mediaUploadApiError.js';

describe('getApiErrorMessage — upload / rate limit', () => {
  before(() => {
    initI18n('en');
  });

  it('maps presign HTTP 429 with RATE_LIMITED body and retryAfterSeconds', () => {
    const err = {
      response: {
        status: 429,
        data: {
          code: 'RATE_LIMITED',
          details: { retryAfterSeconds: 42 },
        },
        headers: {},
      },
    };
    assert.equal(getApiErrorCode(err), 'RATE_LIMITED');
    assert.equal(getRetryAfterSeconds(err), 42);
    const message = getApiErrorMessage(err);
    assert.match(message, /42/);
    assert.match(message, /Upload limit/i);
  });

  it('maps HTTP 429 without body code using Retry-After header', () => {
    const err = {
      response: {
        status: 429,
        data: { message: 'Too Many Requests' },
        headers: { 'retry-after': '15' },
      },
    };
    assert.equal(getApiErrorCode(err), 'RATE_LIMITED');
    assert.equal(getRetryAfterSeconds(err), 15);
    const message = getApiErrorMessage(err);
    assert.match(message, /15/);
  });

  it('maps Cloudinary 500 upload failure to MEDIA_UPLOAD_FAILED', () => {
    const err = createCloudinaryUploadError({ status: 500, statusText: 'Error' }, {
      error: { message: 'cloudinary down' },
    });
    assert.equal(getApiErrorCode(err), 'MEDIA_UPLOAD_FAILED');
    const message = getApiErrorMessage(err);
    assert.match(message, /Could not upload/i);
  });

  it('treats fetch network errors as NETWORK_ERROR', () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    assert.equal(getApiErrorCode(err), 'NETWORK_ERROR');
    const message = getApiErrorMessage(err);
    assert.match(message, /connect/i);
  });
});
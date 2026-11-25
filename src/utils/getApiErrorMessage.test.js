import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.js';
import {
  getApiErrorCode,
  getApiErrorMessage,
  getRetryAfterSeconds,
} from './getApiErrorMessage.js';
import { createCloudinaryUploadError } from './mediaUploadApiError.js';

describe('getApiErrorMessage — upload / rate limit', () => {
  beforeAll(() => {
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
    expect(getApiErrorCode(err)).toBe('RATE_LIMITED');
    expect(getRetryAfterSeconds(err)).toBe(42);
    const message = getApiErrorMessage(err);
    expect(message).toMatch(/42/);
    expect(message).toMatch(/Upload limit/i);
  });

  it('maps HTTP 429 without body code using Retry-After header', () => {
    const err = {
      response: {
        status: 429,
        data: { message: 'Too Many Requests' },
        headers: { 'retry-after': '15' },
      },
    };
    expect(getApiErrorCode(err)).toBe('RATE_LIMITED');
    expect(getRetryAfterSeconds(err)).toBe(15);
    const message = getApiErrorMessage(err);
    expect(message).toMatch(/15/);
  });

  it('maps Cloudinary 500 upload failure to MEDIA_UPLOAD_FAILED', () => {
    const err = createCloudinaryUploadError({ status: 500, statusText: 'Error' }, {
      error: { message: 'cloudinary down' },
    });
    expect(getApiErrorCode(err)).toBe('MEDIA_UPLOAD_FAILED');
    const message = getApiErrorMessage(err);
    expect(message).toMatch(/Could not upload/i);
  });

  it('treats fetch network errors as NETWORK_ERROR', () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    expect(getApiErrorCode(err)).toBe('NETWORK_ERROR');
    const message = getApiErrorMessage(err);
    expect(message).toMatch(/connect/i);
  });
});
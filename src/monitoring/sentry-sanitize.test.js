import { describe, expect, it } from 'vitest';
import {
  filterTags,
  sanitizeSentryEvent,
  scrubFreeText,
} from './sentry-sanitize.js';

describe('sentry-sanitize (frontend)', () => {
  it('redacts secrets in free text', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.sig';
    expect(scrubFreeText(`Bearer ${jwt}`)).toBe('[redacted]');
    expect(scrubFreeText('my password is secret')).toBe('[redacted]');
  });

  it('allowlists tags only', () => {
    expect(
      filterTags({
        api_code: 'INTERNAL_ERROR',
        email: 'leak@example.com',
        device_id: 'must-not-send',
      }),
    ).toEqual({ api_code: 'INTERNAL_ERROR' });
  });

  it('strips request/user and private luna text from breadcrumbs', () => {
    const event = sanitizeSentryEvent({
      request: { url: '/api/luna?token=abc' },
      user: { id: '1' },
      breadcrumbs: [
        { category: 'ui', message: 'Luna said: private diary contents' },
      ],
      tags: { api_status: '500', session: 'no' },
    });
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.tags).toEqual({ api_status: '500' });
  });
});
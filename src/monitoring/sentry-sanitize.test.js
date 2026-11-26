import { describe, expect, it } from 'vitest';
import {
  filterTags,
  finalizeSentryPayload,
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

  it('finalize removes arbitrary private text from transport payload', () => {
    const secret = 'довільний приватний текст без regex';
    const event = finalizeSentryPayload({
      request: { url: '/api/luna?token=abc' },
      user: { id: '1' },
      message: secret,
      breadcrumbs: [
        { category: 'ui', message: 'Luna said: private diary contents' },
      ],
      exception: {
        values: [
          {
            type: 'TypeError',
            value: secret,
            stacktrace: { frames: [{ context_line: secret }] },
          },
        ],
      },
      tags: { api_status: '500', session: 'no' },
    });
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.tags).toEqual({ api_status: '500' });
    const json = JSON.stringify(event);
    expect(json).not.toContain(secret);
    expect(json).not.toContain('Luna');
    expect(json).not.toContain('private diary');
    expect(event.exception.values[0]).toEqual({ type: 'TypeError' });
    expect(event.breadcrumbs[0]).toEqual({ category: 'ui', level: undefined });
  });

  it('keeps only fixed API messages', () => {
    expect(finalizeSentryPayload({ message: 'API 502' }).message).toBe('API 502');
    expect(
      finalizeSentryPayload({ message: 'something broke' }).message,
    ).toBeUndefined();
  });
});
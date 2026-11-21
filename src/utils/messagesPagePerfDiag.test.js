import { describe, expect, it } from 'vitest';
import {
  beginMessagesPagePerfSession,
  isMessagesPagePerfDiagEnabled,
} from './messagesPagePerfDiag';

describe('messagesPagePerfDiag', () => {
  it('is off unless DEV and VITE_PERF_MESSAGES_DIAG=1', () => {
    expect(isMessagesPagePerfDiagEnabled()).toBe(false);
  });

  it('does not start session when disabled', () => {
    expect(beginMessagesPagePerfSession()).toBeNull();
  });
});
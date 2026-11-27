import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_VIOLATION_TYPE,
  feedbackTypesForIntent,
  isViolationTypeRejected,
} from './feedbackCompose';

describe('feedbackCompose', () => {
  it('keeps support types technical only', () => {
    const types = feedbackTypesForIntent('support').map((t) => t.id);
    expect(types).toEqual(['BUG', 'UNCLEAR']);
  });

  it('omits type picker for report intent', () => {
    expect(feedbackTypesForIntent('report')).toEqual([]);
    expect(FEEDBACK_VIOLATION_TYPE).toBe('VIOLATION');
  });

  it('detects rejected violation type from API validation', () => {
    expect(
      isViolationTypeRejected({
        response: { status: 400, data: { code: 'VALIDATION_ERROR' } },
      }),
    ).toBe(true);
  });
});
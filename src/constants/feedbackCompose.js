import { FEEDBACK_TYPES } from '../zustand/useFeedbackStore';

/**
 * Planned feedback type for policy / safety reports from the burger menu.
 * Requires backend Prisma enum `FeedbackType.VIOLATION` (see docs/feedback-violation-type.md).
 */
export const FEEDBACK_VIOLATION_TYPE = 'VIOLATION';

export const FEEDBACK_SUPPORT_TYPE_IDS = ['BUG', 'UNCLEAR'];

export function feedbackTypesForIntent(composeIntent) {
  if (composeIntent === 'support') {
    return FEEDBACK_TYPES.filter((item) =>
      FEEDBACK_SUPPORT_TYPE_IDS.includes(item.id),
    );
  }
  if (composeIntent === 'report') {
    return [];
  }
  return FEEDBACK_TYPES;
}

export function isViolationTypeRejected(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  return (
    status === 400 &&
    (code === 'VALIDATION_ERROR' || String(error?.response?.data?.message || '').includes('type'))
  );
}
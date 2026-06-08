export const MESSAGE_CREATED_EVENT = 'meyou:message.created';
export const MESSAGE_READ_EVENT = 'meyou:message.read';

export function dispatchMessageCreated(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(MESSAGE_CREATED_EVENT, { detail }),
  );
}

export function dispatchMessageRead(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MESSAGE_READ_EVENT, { detail }));
}

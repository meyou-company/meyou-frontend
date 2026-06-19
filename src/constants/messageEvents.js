export const MESSAGE_CREATED_EVENT = 'meyou:message.created';
export const MESSAGE_READ_EVENT = 'meyou:message.read';
export const MESSAGE_UPDATED_EVENT = 'meyou:message.updated';
export const MESSAGE_DELETED_EVENT = 'meyou:message.deleted';
export const MESSAGE_SEEN_EVENT = 'meyou:message.seen';
export const MESSAGE_REACTION_ADDED_EVENT = 'meyou:message.reactionAdded';
export const MESSAGE_REACTION_REMOVED_EVENT = 'meyou:message.reactionRemoved';
export const MESSAGE_PINNED_EVENT = 'meyou:message.pinned';
export const MESSAGE_UNPINNED_EVENT = 'meyou:message.unpinned';
export const USER_TYPING_EVENT = 'meyou:user.typing';
export const USER_STOP_TYPING_EVENT = 'meyou:user.stopTyping';

function dispatch(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function dispatchMessageCreated(detail) {
  dispatch(MESSAGE_CREATED_EVENT, detail);
}

export function dispatchMessageRead(detail) {
  dispatch(MESSAGE_READ_EVENT, detail);
}

export function dispatchMessageUpdated(detail) {
  dispatch(MESSAGE_UPDATED_EVENT, detail);
}

export function dispatchMessageDeleted(detail) {
  dispatch(MESSAGE_DELETED_EVENT, detail);
}

export function dispatchMessageSeen(detail) {
  dispatch(MESSAGE_SEEN_EVENT, detail);
}

export function dispatchMessageReactionAdded(detail) {
  dispatch(MESSAGE_REACTION_ADDED_EVENT, detail);
}

export function dispatchMessageReactionRemoved(detail) {
  dispatch(MESSAGE_REACTION_REMOVED_EVENT, detail);
}

export function dispatchMessagePinned(detail) {
  dispatch(MESSAGE_PINNED_EVENT, detail);
}

export function dispatchMessageUnpinned(detail) {
  dispatch(MESSAGE_UNPINNED_EVENT, detail);
}

export function dispatchUserTyping(detail) {
  dispatch(USER_TYPING_EVENT, detail);
}

export function dispatchUserStopTyping(detail) {
  dispatch(USER_STOP_TYPING_EVENT, detail);
}

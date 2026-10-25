export function applyIncomingUnreadTotal(
  current,
  { totalUnreadCount, incrementUnread, isActiveVisibleChat } = {},
) {
  if (typeof totalUnreadCount === 'number') {
    return Math.max(0, totalUnreadCount);
  }
  if (isActiveVisibleChat) return Math.max(0, Number(current) || 0);
  if (incrementUnread === false) return Math.max(0, Number(current) || 0);
  return Math.max(0, (Number(current) || 0) + 1);
}

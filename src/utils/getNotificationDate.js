export function getNotificationDate(item) {
  return item.eventAt || item.createdAt;
}

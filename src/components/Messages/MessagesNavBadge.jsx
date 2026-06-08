import { useMessagesStore } from '../../zustand/useMessagesStore';
import '../Notifications/Notifications.scss';

export default function MessagesNavBadge({ className = '' }) {
  const totalUnreadCount = useMessagesStore((s) => s.totalUnreadCount);

  if (totalUnreadCount <= 0) return null;

  return (
    <span className={`notification-bell__badge messages-nav-badge ${className}`.trim()}>
      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
    </span>
  );
}

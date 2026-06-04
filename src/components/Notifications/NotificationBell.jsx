import { useNotificationsStore } from '../../zustand/useNotificationsStore';
import profileIcons from '../../constants/profileIcons';
import './Notifications.scss';

export default function NotificationBell({ onGoNotifications, className }) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  console.log('Bell unreadCount:', unreadCount);
  const handleClick = () => {
    onGoNotifications?.();
  };

  return (
    <button className={`notification-bell ${className}`} onClick={handleClick}>
      <img src={profileIcons.bell} alt="" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  );
}

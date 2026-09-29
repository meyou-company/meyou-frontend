import {
  selectPendingGiftCount,
  useGiftInboxStore,
} from '../../zustand/useGiftInboxStore';
import '../Notifications/Notifications.scss';

export default function GiftInboxBadge({ className = '' }) {
  const count = useGiftInboxStore(selectPendingGiftCount);

  if (count <= 0) return null;

  return (
    <span className={`notification-bell__badge messages-nav-badge ${className}`.trim()}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

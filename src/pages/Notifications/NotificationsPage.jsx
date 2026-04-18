import { useNavigate } from 'react-router-dom';

import Notifications from '../../components/Notifications/Notifications';

export default function NotificationsPage() {
  const navigate = useNavigate();

  return (
    <Notifications
      onGoBack={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/profile');
        }
      }}
    />
  );
}

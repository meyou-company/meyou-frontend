const PERMISSION_ASKED_KEY = 'meyou_messages_notif_permission_asked';

export async function ensureMessageNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    if (sessionStorage.getItem(PERMISSION_ASKED_KEY) === '1') {
      return Notification.permission;
    }
    sessionStorage.setItem(PERMISSION_ASKED_KEY, '1');
  } catch {
    /* ignore */
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function showMessageBrowserNotification({ title, body, conversationId }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body: body || '',
      tag: conversationId ? `meyou-msg-${conversationId}` : 'meyou-msg',
      renotify: true,
    });

    notification.onclick = () => {
      window.focus();
      if (conversationId) {
        window.location.assign(`/messages/${conversationId}`);
      } else {
        window.location.assign('/messages');
      }
      notification.close();
    };
  } catch {
    /* ignore */
  }
}

import { formatTime } from './utils';

const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  LIKE: 'like',
  COMMENT: 'comment',
};

function getVerb(type, gender) {
  const isFemale = gender === 'female';

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW:
      return isFemale ? 'підписалась' : 'підписався';

    case NOTIFICATION_TYPES.LIKE:
      return isFemale ? 'лайкнула' : 'лайкнув';

    case NOTIFICATION_TYPES.COMMENT:
      return isFemale ? 'прокоментувала' : 'прокоментував';

    default:
      return '';
  }
}

export default function NotificationItem({ item }) {
  const { type, user, createdAt, isRead } = item;

  return (
    <div className={`notification ${!isRead ? 'unread' : ''}`}>
      <div className="notification__avatar">
        <img src={user.avatar} alt="" />
        {!isRead && <span className="notification__dot" />}
      </div>

      <div className="notification__content">
        <div className="notification__group">
          <p className="notification__text">
            <b>{user.name}</b> {getVerb(type, user.gender)}{' '}
            {type === NOTIFICATION_TYPES.FOLLOW && 'на вас'}
            {type === NOTIFICATION_TYPES.LIKE && 'ваш пост'}
          </p>

          {type === NOTIFICATION_TYPES.COMMENT && (
            <p className="notification__comment">“{item.comment}”</p>
          )}
        </div>

        <span className="notification__time">{formatTime(createdAt)}</span>
      </div>

      <div className="notification__actions">
        {type === NOTIFICATION_TYPES.FOLLOW && <button className="followBtn">Підписатись</button>}

        {type === NOTIFICATION_TYPES.LIKE && <span className="notification__icon">❤️</span>}

        {type === NOTIFICATION_TYPES.COMMENT && <span className="notification__icon">💬</span>}
      </div>
    </div>
  );
}

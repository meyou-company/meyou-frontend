import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../utils/utils';

import { getNotificationDate } from '../../utils/getNotificationDate';
import { useFollowingStore } from '../../zustand/useFollowingStore';

export default function NotificationItem({ item, onRead }) {
  const navigate = useNavigate();

  const isFollowing = useFollowingStore((s) => s.isFollowing);
  const follow = useFollowingStore((s) => s.follow);
  const unfollow = useFollowingStore((s) => s.unfollow);

  const isSubscribed = isFollowing(item.actor.id);

  const [loadingFollow, setLoadingFollow] = useState(false);

  const handleClick = () => {
    if (!item.readAt) onRead(item.id);
    navigate(buildLink(item));
  };

  const handleFollow = async (e) => {
    e.stopPropagation();

    if (loadingFollow) return;
    setLoadingFollow(true);

    try {
      if (isSubscribed) {
        await unfollow(item.actor.id);
      } else {
        await follow(item.actor.id);
      }
      if (!item.readAt) {
        await onRead(item.id);
      }
    } finally {
      setLoadingFollow(false);
    }
  };

  const action = renderAction(item, isSubscribed, handleFollow, loadingFollow);

  return (
    <div className={`notification ${!item.readAt ? 'unread' : ''}`}>
      <div className="notification__avatar" onClick={handleClick}>
        <img src={item.actor.avatar} alt={item.actor.name} />
        {!item.readAt && <span className="notification__dot" />}
      </div>

      <div className="notification__content">
        <div className="notification__main" onClick={handleClick}>
          <div className="notification__texts">
            <p className="notification__text">{item.body}</p>
          </div>

          {item.previewText && <p className="notification__comment">“{item.previewText}”</p>}

          <span className="notification__time">{formatTime(getNotificationDate(item))}</span>
        </div>

        <div className="notification__right">
          {action && <div className="notification__actions">{action}</div>}

          {item.previewImage && (
            <div
              className="notification__preview"
              onClick={item.type !== 'newFollower' ? handleClick : undefined}
            >
              <img src={item.previewImage} alt="" />
              {renderOverlayIcon(item)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildLink(item) {
  switch (item.targetType) {
    case 'postLike':
      return `/profile?post=${item.targetId}`;
    case 'postShare':
      return `/profile?post=${item.targetId}`;
    case 'postComment':
      return `/profile?post=${item.targetId}&focus=comments`;
    case 'newFollower':
      return `/profile/${item.actor.username}`;
    default:
      return '/notifications';
  }
}

function renderAction(item, isSubscribed, onFollow, loading) {
  if (item.type !== 'newFollower') return null;

  return (
    <button className="follow-btn" onClick={onFollow} disabled={loading}>
      {loading ? 'Загрузка...' : isSubscribed ? 'Отписаться' : 'Подписаться'}
    </button>
  );
}

function renderOverlayIcon(item) {
  switch (item.type) {
    case 'postLike':
      return <span className="notification__overlay">❤️</span>;

    case 'postComment':
      return <span className="notification__overlay">💬</span>;

    default:
      return null;
  }
}

import profileIcons from '../constants/profileIcons';

export function mapNotification(n) {
  const actor = n.actor || {};
  const post = n.post || {};

  const actorName =
    [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.username || 'Пользователь';

  return {
    id: n.id,
    type: mapType(n.type),
    text: buildText(n.type, actorName),
    createdAt: n.createdAt,
    isRead: !!n.readAt,

    actor: {
      id: actor.id,
      name: actorName,
      username: actor.username,
      avatar: typeof actor.avatarUrl === 'string' ? actor.avatarUrl : profileIcons.user,
    },

    targetType: mapType(n.type),
    targetId: n.postId || n.actorId,
    previewText: getPreviewText(n),
    previewImage: getPreviewImage(post),
  };
}

function mapType(type) {
  switch (type) {
    case 'FOLLOW':
      return 'newFollower';
    case 'LIKE':
      return 'postLike';
    case 'COMMENT':
      return 'postComment';
    case 'MENTION':
      return 'mention';
    case 'POST':
      return 'newPost';
    default:
      return 'system';
  }
}

function buildText(type, name) {
  switch (type) {
    case 'FOLLOW':
      return `${name} подписался (-лась) на вас`;

    case 'LIKE':
      return `${name} лайкнул (-ла) ваш пост`;

    case 'COMMENT':
      return `${name} прокомментировал (-ла) ваш пост`;

    case 'MENTION':
      return `${name} отметил (-ла) вас`;

    case 'POST':
      return `${name} добавил (-ла) новый пост`;

    default:
      return `Новое сообщение`;
  }
}

function getPreviewText(n) {
  if (n.type === 'COMMENT') {
    return n.body || null;
  }

  return null; // ❗ не показуємо текст поста для лайків
}

function getPreviewImage(post) {
  if (post?.imageUrl) return post.imageUrl;

  if (Array.isArray(post?.media) && post.media.length > 0) {
    return post.media[0].url;
  }

  return null;
}

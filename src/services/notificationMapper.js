import profileIcons from '../constants/profileIcons';

const notificationTypeMap = {
  FOLLOW: 'newFollower',
  LIKE: 'postLike',
  COMMENT: 'postComment',
  MENTION: 'mention',
  POST: 'newPost',
  SHARE: 'postShare',
  SYSTEM: 'system',
};

export function mapType(type) {
  return notificationTypeMap[type] || 'system';
}

export function mapNotification(n) {
  const actor = n.actor || {};
  const post = n.post || {};

  const actorName =
    [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.username || 'Пользователь';

  return {
    id: n.id,

    type: mapType(n.type),

    rawType: n.type,

    title: n.title || 'Уведомление',

    body: n.body || 'Новое уведомление',

    createdAt: n.createdAt,

    updatedAt: n.updatedAt,

    eventAt: n.eventAt,

    readAt: n.readAt,

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

function getPreviewText(n) {
  if (n.type === 'COMMENT') {
    return n.metadata?.previewText || null;
  }

  return null; //  не показуємо текст поста для лайків
}

function getPreviewImage(post) {
  if (post?.imageUrl) return post.imageUrl;

  if (Array.isArray(post?.media) && post.media.length > 0) {
    return post.media[0]?.url || null;
  }

  return null;
}

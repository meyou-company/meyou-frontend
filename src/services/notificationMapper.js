import profileIcons from '../constants/profileIcons';

const notificationTypeMap = {
  FOLLOW: 'newFollower',
  LIKE: 'postLike',
  COMMENT: 'postComment',
  COMMENT_REPLY: 'postCommentReply',
  MENTION: 'mention',
  POST: 'newPost',
  SHARE: 'postShare',
  SHARED_TO_USER: 'postSharedToUser',
  MESSAGE: 'message',
  SYSTEM: 'system',
};

export function mapType(type) {
  return notificationTypeMap[type] || 'system';
}

export function unwrapRealtimeNotificationEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return { notification: null, unreadCountApprox: undefined };
  }
  if (envelope.notification && typeof envelope.notification === 'object') {
    return {
      notification: envelope.notification,
      unreadCountApprox: envelope.unreadCountApprox,
    };
  }
  return {
    notification: envelope,
    unreadCountApprox: envelope.unreadCountApprox,
  };
}

export function mapNotification(n) {
  const actor = n.actor || {};
  const post = n.post || {};
  const metadata = n.metadata || {};

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

    eventAt: n.eventAt || n.createdAt,

    readAt: n.readAt,
    isRead: Boolean(n.readAt),

    actor: {
      id: actor.id,
      name: actorName,
      username: actor.username,
      avatar: typeof actor.avatarUrl === 'string' ? actor.avatarUrl : profileIcons.user,
    },

    post: {
      id: post.id,
      authorId: post.authorId,
      media: post.media || [],
    },

    target: buildTarget(n, post, metadata),
    previewText: getPreviewText(n),
    previewImage: getPreviewImage(post),
  };
}

function buildTarget(n, post, metadata) {
  switch (n.type) {
    case 'SHARED_TO_USER':
      return {
        type: 'post',
        postId: post.id,
        authorId: post.authorId,
      };

    case 'SHARE':
      return {
        type: 'post',
        postId: post.id,
      };

    case 'COMMENT_REPLY':
      return {
        type: 'comment',
        postId: post.id,
        commentId: metadata.commentId,
        parentCommentId: metadata.parentCommentId,
      };

    case 'COMMENT':
      return {
        type: 'comment',
        postId: post.id,
        commentId: metadata.commentId,
      };

    case 'LIKE':
      return {
        type: 'post',
        postId: post.id,
      };

    case 'FOLLOW':
      return {
        type: 'profile',
        userId: n.actorId,
      };

    case 'MESSAGE':
      return {
        type: 'conversation',
        conversationId: metadata.conversationId,
      };

    default:
      return {
        type: 'notifications',
      };
  }
}

function getPreviewText(n) {
  if (n.type === 'COMMENT' || n.type === 'COMMENT_REPLY' || n.type === 'MESSAGE') {
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

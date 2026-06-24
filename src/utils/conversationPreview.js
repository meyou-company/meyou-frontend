import { getStoryMessageText, getStoryReplyPreview } from './storyMessagePreview';

export function getConversationLastMessagePreview(lastMessage, t) {
  if (!lastMessage?.id) {
    return t('messenger.noMessages');
  }

  if (lastMessage.deletedForEveryone) {
    return t('messenger.deletedMessage');
  }

  const storyPreview = getStoryReplyPreview(lastMessage);
  if (storyPreview?.isUnavailable) {
    return t('messenger.storyUnavailable', { defaultValue: 'Story is no longer available' });
  }
  if (storyPreview) {
    return storyPreview.kind === 'forward'
      ? t('messenger.storyForwarded', { defaultValue: 'Сторис переслали' })
      : t('messenger.storyReply', { defaultValue: 'Story reply' });
  }

  const text = getStoryMessageText(lastMessage).trim();
  if (text) return text;

  if (lastMessage.forwardedFrom) {
    return t('messenger.forwarded');
  }

  const attachments = Array.isArray(lastMessage.attachments) ? lastMessage.attachments : [];
  const type = lastMessage.type;

  const hasImage =
    type === 'IMAGE' || attachments.some((a) => (a.mimeType || '').startsWith('image/'));
  if (hasImage) return t('messenger.previewPhoto');

  const hasVideo =
    type === 'VIDEO' || attachments.some((a) => (a.mimeType || '').startsWith('video/'));
  if (hasVideo) return t('messenger.previewVideo');

  const hasAudio =
    type === 'AUDIO' || attachments.some((a) => (a.mimeType || '').startsWith('audio/'));
  if (hasAudio) return t('messenger.previewVoice');

  const hasFile = type === 'FILE' || attachments.length > 0;
  if (hasFile) return t('messenger.previewFile');

  return t('messenger.attachmentPreview');
}

export function conversationMatchesSearch(chat, query, t, getDisplayName) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (getDisplayName?.(chat.participant, '') || '').toLowerCase();
  const preview = getConversationLastMessagePreview(chat.lastMessage, t).toLowerCase();
  return name.includes(q) || preview.includes(q);
}

export function patchConversationLastMessage(conversations, conversationId, message) {
  if (!conversationId || !message?.id) return conversations;
  return conversations.map((c) => {
    if (String(c.id) !== String(conversationId)) return c;
    if (String(c.lastMessage?.id) !== String(message.id)) return c;
    return { ...c, lastMessage: message };
  });
}

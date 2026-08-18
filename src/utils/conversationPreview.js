import { getStoryMessageText, getStoryReplyPreview } from './storyMessagePreview';
import { formatCallEventLabel } from './callEventMessage';
import { formatDraftListPreview, getConversationDraft, isNonEmptyDraft } from './messageDrafts';

export function getConversationLastMessagePreview(lastMessage, t, viewerId) {
  if (!lastMessage?.id) {
    return t('messenger.noMessages');
  }

  if (lastMessage.deletedForEveryone) {
    return t('messenger.deletedMessage');
  }

  if (lastMessage.type === 'CALL_EVENT') {
    return formatCallEventLabel(lastMessage, t, viewerId);
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

export function getConversationListPreview(chat, t, viewerId, drafts) {
  const draftText = getConversationDraft(drafts, chat?.id);
  if (isNonEmptyDraft(draftText)) {
    return {
      isDraft: true,
      text: formatDraftListPreview(draftText, t),
      draftText: draftText.replace(/\s+/g, ' ').trim(),
    };
  }

  return {
    isDraft: false,
    text: getConversationLastMessagePreview(chat?.lastMessage, t, viewerId),
    draftText: '',
  };
}

export function conversationMatchesSearch(chat, query, t, getDisplayName, drafts) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (getDisplayName?.(chat.participant, '') || '').toLowerCase();
  const preview = getConversationListPreview(chat, t, undefined, drafts);
  return name.includes(q) || preview.text.toLowerCase().includes(q);
}

export function patchConversationLastMessage(conversations, conversationId, message) {
  if (!conversationId || !message?.id) return conversations;
  return conversations.map((c) => {
    if (String(c.id) !== String(conversationId)) return c;
    if (String(c.lastMessage?.id) !== String(message.id)) return c;
    return { ...c, lastMessage: message };
  });
}

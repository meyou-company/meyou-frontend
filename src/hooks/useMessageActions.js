import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { emojiToReactionType } from '../constants/messageReactions';
import { conversationsApi } from '../services/conversationsApi';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export function useMessageActions({
  onReply,
  onForward,
  onReport,
  onEdit,
  onMessageRemoved,
  onMessageUpdated,
  onPinnedChange,
  pinnedMessageId,
}) {
  const { t } = useTranslation();

  const handleReply = useCallback(
    (message) => {
      onReply?.({
        id: message.id,
        text: message.text || t('messenger.attachmentPreview'),
        senderId: message.senderId,
      });
    },
    [onReply, t],
  );

  const handleForward = useCallback(
    (message) => {
      onForward?.(message);
    },
    [onForward],
  );

  const handleCopy = useCallback(
    async (message) => {
      try {
        await navigator.clipboard.writeText(message.text || '');
        toast.success(t('messenger.copySuccess'));
      } catch {
        toast.error(t('errors.generic'));
      }
    },
    [t],
  );

  const handleTranslate = useCallback(
    async (message) => {
      try {
        const result = await conversationsApi.translateMessage(message.id);
        if (result?.translatedText) {
          toast.success(result.translatedText, { duration: 8000 });
        } else {
          toast.info(result?.note || t('messenger.translate.notAvailable'));
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
      }
    },
    [t],
  );

  const handlePin = useCallback(
    async (message) => {
      try {
        if (String(pinnedMessageId) === String(message.id)) {
          await conversationsApi.unpinMessage(message.id);
          onPinnedChange?.(null);
          toast.success(t('messenger.unpinSuccess'));
        } else {
          await conversationsApi.pinMessage(message.id);
          onPinnedChange?.(message.id);
          toast.success(t('messenger.pinSuccess'));
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
      }
    },
    [onPinnedChange, pinnedMessageId, t],
  );

  const handleEdit = useCallback(
    (message) => {
      onEdit?.(message);
    },
    [onEdit],
  );

  const handleDeleteForMe = useCallback(
    async (message) => {
      try {
        await conversationsApi.deleteForMe(message.id);
        onMessageRemoved?.(message.id);
        toast.success(t('messenger.deleteSuccess'));
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
      }
    },
    [onMessageRemoved, t],
  );

  const handleDeleteForEveryone = useCallback(
    async (message) => {
      try {
        const updated = await conversationsApi.deleteForEveryone(message.id);
        onMessageUpdated?.(updated);
        toast.success(t('messenger.deleteSuccess'));
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
      }
    },
    [onMessageUpdated, t],
  );

  const handleReport = useCallback(
    (message) => {
      onReport?.(message);
    },
    [onReport],
  );

  const handleReaction = useCallback(
    async (messageId, emoji, currentReactions = [], currentUserId) => {
      const reactionType = emojiToReactionType(emoji);
      if (!reactionType) return null;

      const mine = currentReactions.find(
        (r) => String(r.userId) === String(currentUserId),
      );
      const mineEmoji = mine?.emoji ?? null;

      try {
        if (mineEmoji === emoji) {
          await conversationsApi.removeReaction(messageId);
          return { messageId, removed: true, userId: currentUserId };
        }
        const result = await conversationsApi.addReaction(messageId, reactionType);
        return {
          messageId,
          reaction: {
            userId: currentUserId,
            reactionType: result.reactionType,
            emoji: result.emoji,
          },
        };
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
        return null;
      }
    },
    [],
  );

  const handleMenuAction = useCallback(
    (actionId, message) => {
      if (!message) return;

      const actions = {
        reply: handleReply,
        forward: handleForward,
        copy: handleCopy,
        translate: handleTranslate,
        pin: handlePin,
        edit: handleEdit,
        deleteForMe: handleDeleteForMe,
        deleteForAll: handleDeleteForEveryone,
        report: handleReport,
      };

      actions[actionId]?.(message);
    },
    [
      handleReply,
      handleForward,
      handleCopy,
      handleTranslate,
      handlePin,
      handleEdit,
      handleDeleteForMe,
      handleDeleteForEveryone,
      handleReport,
    ],
  );

  return {
    handleReply,
    handleForward,
    handleCopy,
    handleTranslate,
    handlePin,
    handleEdit,
    handleDeleteForMe,
    handleDeleteForEveryone,
    handleReport,
    handleReaction,
    handleMenuAction,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSec009ChatPrivateDeliveryEnabled } from '../config/sec009ChatDelivery';
import {
  loadChatAttachmentDelivery,
  subscribeChatDelivery,
} from '../utils/chatMediaDeliveryCache';

/**
 * @param {{
 *   conversationId?: string;
 *   attachmentId?: string;
 *   legacyUrl?: string;
 *   enabled?: boolean;
 *   lazy?: boolean;
 * }} props
 */
export function useChatAttachmentDelivery({
  conversationId,
  attachmentId,
  legacyUrl = '',
  enabled = isSec009ChatPrivateDeliveryEnabled(),
  lazy = true,
}) {
  const [visible, setVisible] = useState(!lazy);
  const [entry, setEntry] = useState(null);
  const mediaErrorRetries = useRef(0);

  const protectedMode = Boolean(enabled && conversationId && attachmentId);

  useEffect(() => {
    if (!protectedMode || !visible) return undefined;

    const unsub = subscribeChatDelivery(conversationId, attachmentId, setEntry);
    void loadChatAttachmentDelivery(conversationId, attachmentId);

    return unsub;
  }, [protectedMode, visible, conversationId, attachmentId]);

  const retry = useCallback(() => {
    if (!protectedMode) return;
    mediaErrorRetries.current = 0;
    void loadChatAttachmentDelivery(conversationId, attachmentId, { force: true });
  }, [protectedMode, conversationId, attachmentId]);

  const onMediaError = useCallback(() => {
    if (!protectedMode || !entry?.cdnEnforcesExpiry) return;
    if (mediaErrorRetries.current >= 1) return;
    mediaErrorRetries.current += 1;
    void loadChatAttachmentDelivery(conversationId, attachmentId, {
      force: true,
      reason: 'media_error',
    });
  }, [protectedMode, entry?.cdnEnforcesExpiry, conversationId, attachmentId]);

  const observe = useCallback((node) => {
    if (!lazy || !node) return undefined;
    const io = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) setVisible(true);
      },
      { rootMargin: '120px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazy]);

  if (!protectedMode) {
    return {
      mode: 'legacy',
      url: legacyUrl,
      status: 'legacy',
      loading: false,
      error: null,
      retry: undefined,
      onMediaError: undefined,
      observe,
      useProtectedUrl: false,
    };
  }

  const url =
    entry?.status === 'ready' && entry.deliveryUrl
      ? entry.deliveryUrl
      : entry?.status === 'loading' && entry.deliveryUrl
        ? entry.deliveryUrl
        : null;

  return {
    mode: 'protected',
    url,
    status: entry?.status ?? 'loading',
    loading: entry?.status === 'loading' || (!entry && visible),
    error: entry?.status === 'error' ? entry.error : null,
    retry,
    onMediaError,
    observe,
    useProtectedUrl: true,
    cdnEnforcesExpiry: Boolean(entry?.cdnEnforcesExpiry),
  };
}
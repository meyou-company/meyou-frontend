import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatAttachmentDelivery } from '../../hooks/useChatAttachmentDelivery';
import {
  cloudinaryAttachmentDisplayUrl,
  inferMediaKind,
  normalizeAttachment,
} from '../../utils/messageAttachmentMedia';

function resolveDisplayUrl(url, kind, useProtectedUrl) {
  if (!url) return url;
  if (useProtectedUrl) return url;
  return cloudinaryAttachmentDisplayUrl(url, kind);
}

export default function ChatAttachmentMedia({
  rawAtt,
  messageType,
  conversationId,
  isMine,
  protectedDeliveryEnabled,
  onOpenViewer,
}) {
  const { t } = useTranslation();
  const att = normalizeAttachment(rawAtt, messageType);
  const kind = inferMediaKind({
    mimeType: att.mimeType,
    url: att.url,
    messageType,
  });
  const rootRef = useRef(null);

  const canUseProtectedDelivery =
    protectedDeliveryEnabled && conversationId && att.id;

  const delivery = useChatAttachmentDelivery({
    conversationId,
    attachmentId: att.id,
    legacyUrl: att.url,
    enabled: canUseProtectedDelivery,
    lazy: true,
  });

  useEffect(() => {
    if (!rootRef.current) return undefined;
    return delivery.observe(rootRef.current);
  }, [delivery.observe, canUseProtectedDelivery]);

  const showUrl = delivery.useProtectedUrl
    ? delivery.url
    : resolveDisplayUrl(att.url, kind, false);

  if (delivery.useProtectedUrl && delivery.loading && !showUrl) {
    return (
      <div
        ref={rootRef}
        className={`msgAttachments__placeholder${isMine ? ' is-mine' : ''}`}
        aria-hidden="true"
      />
    );
  }

  if (delivery.useProtectedUrl && delivery.error && !showUrl) {
    const is503 = delivery.error.status === 503;
    return (
      <div
        ref={rootRef}
        className={`msgAttachments__deliveryError${isMine ? ' is-mine' : ''}`}
      >
        <span className="msgAttachments__deliveryErrorText">
          {is503
            ? t('messenger.attachmentDeliveryUnavailable')
            : t('messenger.attachmentDeliveryDenied')}
        </span>
        {!delivery.error.nonRetryable && delivery.retry ? (
          <button
            type="button"
            className="msgAttachments__deliveryRetry"
            onClick={(e) => {
              e.stopPropagation();
              delivery.retry();
            }}
          >
            {t('messenger.attachmentDeliveryRetry')}
          </button>
        ) : null}
      </div>
    );
  }

  if (kind === 'image' && showUrl) {
    return (
      <div ref={rootRef}>
        <button
          type="button"
          className="msgAttachments__imageBtn"
          onClick={(e) =>
            onOpenViewer(e, {
              type: 'image',
              url: showUrl,
              fileName: att.fileName,
              onMediaError: delivery.onMediaError,
            })
          }
          aria-label={t('messenger.mediaViewer.openImage')}
        >
          <img
            className="msgAttachments__image"
            src={resolveDisplayUrl(showUrl, 'image', delivery.useProtectedUrl)}
            alt={att.fileName || t('messenger.attachmentPreview')}
            loading="lazy"
            draggable={false}
            onError={delivery.onMediaError}
          />
        </button>
      </div>
    );
  }

  if (kind === 'video' && showUrl) {
    return (
      <div ref={rootRef} className="msgAttachments__videoWrap">
        <video
          className="msgAttachments__video"
          src={showUrl}
          controls
          preload="metadata"
          onClick={(e) => e.stopPropagation()}
          onError={delivery.onMediaError}
        />
        <button
          type="button"
          className="msgAttachments__expandBtn"
          onClick={(e) =>
            onOpenViewer(e, {
              type: 'video',
              url: showUrl,
              fileName: att.fileName,
              onMediaError: delivery.onMediaError,
            })
          }
          aria-label={t('messenger.mediaViewer.openVideo')}
        >
          ⛶
        </button>
      </div>
    );
  }

  if (kind === 'audio' && showUrl) {
    return (
      <div ref={rootRef}>
        <audio
          className="msgAttachments__audio"
          src={showUrl}
          controls
          preload="metadata"
          onClick={(e) => e.stopPropagation()}
          onError={delivery.onMediaError}
        />
      </div>
    );
  }

  if (!showUrl) return null;

  return (
    <a
      ref={rootRef}
      className={`msgAttachments__file${isMine ? ' is-mine' : ''}`}
      href={showUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={att.fileName || undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="msgAttachments__fileIcon" aria-hidden="true">
        📎
      </span>
      <span className="msgAttachments__fileName">
        {att.fileName || t('messenger.attachmentFile')}
      </span>
    </a>
  );
}
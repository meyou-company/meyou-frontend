import { useTranslation } from 'react-i18next';
import './MessageAttachments.scss';

function isImage(mime) {
  return (mime || '').startsWith('image/');
}

function isVideo(mime) {
  return (mime || '').startsWith('video/');
}

function isAudio(mime) {
  return (mime || '').startsWith('audio/');
}

export default function MessageAttachments({ attachments = [], isMine = false }) {
  const { t } = useTranslation();

  if (!attachments?.length) return null;

  return (
    <div className="msgAttachments">
      {attachments.map((att) => {
        const key = att.id || att.url;
        if (isImage(att.mimeType)) {
          return (
            <a
              key={key}
              className="msgAttachments__imageLink"
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className="msgAttachments__image"
                src={att.url}
                alt={att.fileName || t('messenger.attachmentPreview')}
                loading="lazy"
              />
            </a>
          );
        }
        if (isVideo(att.mimeType)) {
          return (
            <video
              key={key}
              className="msgAttachments__video"
              src={att.url}
              controls
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        if (isAudio(att.mimeType)) {
          return (
            <audio
              key={key}
              className="msgAttachments__audio"
              src={att.url}
              controls
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <a
            key={key}
            className={`msgAttachments__file${isMine ? ' is-mine' : ''}`}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
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
      })}
    </div>
  );
}

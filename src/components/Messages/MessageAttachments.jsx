import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  cloudinaryAttachmentDisplayUrl,
  inferMediaKind,
  normalizeAttachment,
} from '../../utils/messageAttachmentMedia';
import MediaViewerModal from './MediaViewerModal';
import './MessageAttachments.scss';

export default function MessageAttachments({
  attachments = [],
  isMine = false,
  messageType,
}) {
  const { t } = useTranslation();
  const [viewerMedia, setViewerMedia] = useState(null);

  if (!attachments?.length) return null;

  const openViewer = (e, media) => {
    e.preventDefault();
    e.stopPropagation();
    setViewerMedia(media);
  };

  const closeViewer = () => setViewerMedia(null);

  return (
    <>
      <div className="msgAttachments">
        {attachments.map((rawAtt) => {
          const att = normalizeAttachment(rawAtt, messageType);
          const key = att.id || att.url;
          const kind = inferMediaKind({
            mimeType: att.mimeType,
            url: att.url,
            messageType,
          });
          const imageUrl = cloudinaryAttachmentDisplayUrl(att.url, 'image');

          if (kind === 'image' && att.url) {
            return (
              <button
                key={key}
                type="button"
                className="msgAttachments__imageBtn"
                onClick={(e) =>
                  openViewer(e, {
                    type: 'image',
                    url: imageUrl,
                    fileName: att.fileName,
                  })
                }
                aria-label={t('messenger.mediaViewer.openImage')}
              >
                <img
                  className="msgAttachments__image"
                  src={imageUrl}
                  alt={att.fileName || t('messenger.attachmentPreview')}
                  draggable={false}
                />
              </button>
            );
          }

          if (kind === 'video' && att.url) {
            return (
              <div key={key} className="msgAttachments__videoWrap">
                <video
                  className="msgAttachments__video"
                  src={att.url}
                  controls
                  preload="metadata"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="msgAttachments__expandBtn"
                  onClick={(e) =>
                    openViewer(e, {
                      type: 'video',
                      url: att.url,
                      fileName: att.fileName,
                    })
                  }
                  aria-label={t('messenger.mediaViewer.openVideo')}
                >
                  ⛶
                </button>
              </div>
            );
          }

          if (kind === 'audio' && att.url) {
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

          if (!att.url) return null;

          return (
            <a
              key={key}
              className={`msgAttachments__file${isMine ? ' is-mine' : ''}`}
              href={att.url}
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
        })}
      </div>

      <MediaViewerModal
        isOpen={Boolean(viewerMedia)}
        media={viewerMedia}
        onClose={closeViewer}
      />
    </>
  );
}

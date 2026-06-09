import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MediaViewerModal from './MediaViewerModal';
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
        {attachments.map((att) => {
          const key = att.id || att.url;

          if (isImage(att.mimeType)) {
            return (
              <button
                key={key}
                type="button"
                className="msgAttachments__imageBtn"
                onClick={(e) =>
                  openViewer(e, {
                    type: 'image',
                    url: att.url,
                    fileName: att.fileName,
                  })
                }
                aria-label={t('messenger.mediaViewer.openImage')}
              >
                <img
                  className="msgAttachments__image"
                  src={att.url}
                  alt={att.fileName || t('messenger.attachmentPreview')}
                  loading="lazy"
                  draggable={false}
                />
              </button>
            );
          }

          if (isVideo(att.mimeType)) {
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

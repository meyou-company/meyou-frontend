import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './MediaViewerModal.scss';

export default function MediaViewerModal({ isOpen, media, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !media?.url) return null;

  const isVideo = media.type === 'video';

  return (
    <div
      className="msgMediaViewer"
      role="dialog"
      aria-modal="true"
      aria-label={t('messenger.mediaViewer.title')}
      onClick={onClose}
    >
      <button
        type="button"
        className="msgMediaViewer__close"
        onClick={onClose}
        aria-label={t('messenger.mediaViewer.close')}
      >
        ×
      </button>

      <div
        className="msgMediaViewer__content"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            className="msgMediaViewer__video"
            src={media.url}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            className="msgMediaViewer__image"
            src={media.url}
            alt={media.fileName || t('messenger.attachmentPreview')}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

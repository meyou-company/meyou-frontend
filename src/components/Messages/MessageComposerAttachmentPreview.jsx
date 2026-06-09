import { useTranslation } from 'react-i18next';
import { LuFile, LuMic } from 'react-icons/lu';
import './MessageComposerAttachmentPreview.scss';

function isImage(mime) {
  return (mime || '').startsWith('image/');
}

function isVideo(mime) {
  return (mime || '').startsWith('video/');
}

function isAudio(mime) {
  return (mime || '').startsWith('audio/');
}

export default function MessageComposerAttachmentPreview({
  items = [],
  onRemove,
  disabled = false,
}) {
  const { t } = useTranslation();

  if (!items.length) return null;

  return (
    <ul className="msgComposerPreview" aria-label={t('messenger.composer.attachmentsPreview')}>
      {items.map((item) => {
        const mime = item.file?.type || '';
        const name = item.file?.name || t('messenger.attachmentFile');

        return (
          <li key={item.id} className="msgComposerPreview__item">
            <div className="msgComposerPreview__media">
              {isImage(mime) && item.previewUrl ? (
                <img src={item.previewUrl} alt="" className="msgComposerPreview__image" />
              ) : null}
              {isVideo(mime) && item.previewUrl ? (
                <video
                  src={item.previewUrl}
                  className="msgComposerPreview__video"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : null}
              {isAudio(mime) ? (
                <div className="msgComposerPreview__fileTile">
                  <LuMic size={22} aria-hidden="true" />
                  {item.previewUrl ? (
                    <audio src={item.previewUrl} controls className="msgComposerPreview__audio" />
                  ) : (
                    <span className="msgComposerPreview__fileName">{name}</span>
                  )}
                </div>
              ) : null}
              {!isImage(mime) && !isVideo(mime) && !isAudio(mime) ? (
                <div className="msgComposerPreview__fileTile">
                  <LuFile size={22} aria-hidden="true" />
                  <span className="msgComposerPreview__fileName">{name}</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="msgComposerPreview__remove"
              onClick={() => onRemove?.(item.id)}
              disabled={disabled}
              aria-label={t('messenger.composer.removeAttachment')}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

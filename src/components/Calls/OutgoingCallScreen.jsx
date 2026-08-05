import { useTranslation } from 'react-i18next';
import './Calls.scss';

function displayName(user) {
  if (!user) return '';
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || '';
}

export default function OutgoingCallScreen({
  call,
  mediaType,
  connectionStatus,
  onCancel,
}) {
  const { t } = useTranslation();
  if (!call) return null;

  const peer = call.callee;
  const name = displayName(peer) || t('messenger.calls.unknown');
  const isVideo = (mediaType || call.mediaType) === 'VIDEO';

  let statusText = t('messenger.calls.calling');
  if (connectionStatus === 'failed') {
    statusText = t('messenger.calls.connectFailed');
  } else if (connectionStatus === 'connected') {
    statusText = t('messenger.calls.connecting');
  }

  return (
    <div className="callOverlay callOverlay--outgoing" role="dialog" aria-modal="true">
      <div className="callOverlay__card">
        <div className="callOverlay__avatar" aria-hidden="true">
          {peer?.avatarUrl ? (
            <img src={peer.avatarUrl} alt="" />
          ) : (
            <span>{name.charAt(0).toUpperCase() || '?'}</span>
          )}
        </div>
        <p className="callOverlay__label">
          {isVideo ? t('messenger.calls.videoCall') : t('messenger.calls.audioCall')}
        </p>
        <h2 className="callOverlay__name">{name}</h2>
        <p className="callOverlay__hint">{statusText}</p>
        <div className="callOverlay__actions">
          <button
            type="button"
            className="callOverlay__btn callOverlay__btn--reject"
            onClick={onCancel}
          >
            {t('messenger.calls.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import './Calls.scss';

function displayName(user) {
  if (!user) return '';
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || '';
}

export default function IncomingCallModal({
  call,
  onAccept,
  onReject,
  busy = false,
}) {
  const { t } = useTranslation();
  if (!call) return null;

  const caller = call.caller;
  const name = displayName(caller) || t('messenger.calls.unknown');
  const isVideo = call.mediaType === 'VIDEO';

  return (
    <div className="callOverlay callOverlay--incoming" role="dialog" aria-modal="true">
      <div className="callOverlay__card">
        <div className="callOverlay__avatar" aria-hidden="true">
          {caller?.avatarUrl ? (
            <img src={caller.avatarUrl} alt="" />
          ) : (
            <span>{name.charAt(0).toUpperCase() || '?'}</span>
          )}
        </div>
        <p className="callOverlay__label">
          {isVideo
            ? t('messenger.calls.incomingVideo')
            : t('messenger.calls.incomingAudio')}
        </p>
        <h2 className="callOverlay__name">{name}</h2>
        {busy ? (
          <p className="callOverlay__hint">{t('messenger.calls.busy')}</p>
        ) : null}
        <div className="callOverlay__actions">
          <button
            type="button"
            className="callOverlay__btn callOverlay__btn--reject"
            onClick={onReject}
            disabled={busy}
          >
            {t('messenger.calls.reject')}
          </button>
          <button
            type="button"
            className="callOverlay__btn callOverlay__btn--accept"
            onClick={onAccept}
            disabled={busy}
          >
            {t('messenger.calls.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

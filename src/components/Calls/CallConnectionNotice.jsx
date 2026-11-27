import { useTranslation } from 'react-i18next';
import { LuRefreshCw } from 'react-icons/lu';

export default function CallConnectionNotice({ recovery }) {
  const { t } = useTranslation();
  if (!recovery.lost) return null;
  return <div className="callActive__cameraError" role="alert">
    <p className="callActive__cameraErrorBody">{t(recovery.reason === 'DUPLICATE_IDENTITY' ? 'messenger.calls.duplicateSession' : 'messenger.calls.mediaDisconnected')}</p>
    {recovery.errorKey && <p className="callActive__cameraErrorBody">{t(recovery.errorKey)}</p>}
    <button type="button" className="callActive__cameraRetry" disabled={recovery.busy} onClick={() => void recovery.retry()}>
      <LuRefreshCw aria-hidden="true" /> {t(recovery.busy ? 'messenger.calls.reconnecting' : 'common.retry')}
    </button>
  </div>;
}

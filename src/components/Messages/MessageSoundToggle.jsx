import { useTranslation } from 'react-i18next';
import { useMessagesStore } from '../../zustand/useMessagesStore';
import './MessageSoundToggle.scss';

export default function MessageSoundToggle() {
  const { t } = useTranslation();
  const soundEnabled = useMessagesStore((s) => s.soundEnabled);
  const setSoundEnabled = useMessagesStore((s) => s.setSoundEnabled);

  const label = soundEnabled ? t('messenger.muteSound') : t('messenger.unmuteSound');

  return (
    <button
      type="button"
      className={`messageSoundToggle${soundEnabled ? '' : ' is-muted'}`}
      onClick={() => setSoundEnabled(!soundEnabled)}
      aria-pressed={soundEnabled}
      aria-label={t('messenger.soundAria')}
    >
      <SpeakerIcon muted={!soundEnabled} />
      <span className="messageSoundToggle__text">{label}</span>
    </button>
  );
}

function SpeakerIcon({ muted }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {!muted ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <path d="m16 8 4 8M20 8l-4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

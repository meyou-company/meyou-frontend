import { useMessagesStore } from '../../zustand/useMessagesStore';
import './MessageSoundToggle.scss';

export default function MessageSoundToggle() {
  const soundEnabled = useMessagesStore((s) => s.soundEnabled);
  const setSoundEnabled = useMessagesStore((s) => s.setSoundEnabled);

  return (
    <div className="messageSoundToggle">
      <span className="messageSoundToggle__label">🔔 Звук повідомлень:</span>
      <div className="messageSoundToggle__switch" role="group" aria-label="Звук повідомлень">
        <button
          type="button"
          className={`messageSoundToggle__option${soundEnabled ? ' is-active' : ''}`}
          onClick={() => setSoundEnabled(true)}
          aria-pressed={soundEnabled}
        >
          On
        </button>
        <button
          type="button"
          className={`messageSoundToggle__option${!soundEnabled ? ' is-active' : ''}`}
          onClick={() => setSoundEnabled(false)}
          aria-pressed={!soundEnabled}
        >
          Off
        </button>
      </div>
    </div>
  );
}

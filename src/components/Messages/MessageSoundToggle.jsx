import { useTranslation } from 'react-i18next';
import { useMessagesStore } from '../../zustand/useMessagesStore';
import './MessageSoundToggle.scss';

export default function MessageSoundToggle() {
  const { t } = useTranslation();
  const soundEnabled = useMessagesStore((s) => s.soundEnabled);
  const setSoundEnabled = useMessagesStore((s) => s.setSoundEnabled);

  return (
    <div className="messageSoundToggle">
      <span className="messageSoundToggle__label">{t('messenger.soundLabel')}</span>
      <div className="messageSoundToggle__switch" role="group" aria-label="Звук повідомлень">
        <button
          type="button"
          className={`messageSoundToggle__option${soundEnabled ? ' is-active' : ''}`}
          onClick={() => setSoundEnabled(true)}
          aria-pressed={soundEnabled}
        >
          {t('common.on')}
        </button>
        <button
          type="button"
          className={`messageSoundToggle__option${!soundEnabled ? ' is-active' : ''}`}
          onClick={() => setSoundEnabled(false)}
          aria-pressed={!soundEnabled}
        >
          {t('common.off')}
        </button>
      </div>
    </div>
  );
}

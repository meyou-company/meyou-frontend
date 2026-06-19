import { useTranslation } from 'react-i18next';
import './TypingIndicator.scss';

export default function TypingIndicator({ peerName = '' }) {
  const { t } = useTranslation();

  return (
    <div className="msgTyping" role="status" aria-live="polite">
      <span className="msgTyping__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="msgTyping__text">
        {t('messenger.typing', { name: peerName })}
      </span>
    </div>
  );
}

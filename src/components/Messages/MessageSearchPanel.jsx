import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { conversationsApi } from '../../services/conversationsApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './MessageSearchPanel.scss';

export default function MessageSearchPanel({
  conversationId,
  onClose,
  onSelectMessage,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!conversationId) return undefined;

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const data = await conversationsApi.searchMessages(conversationId, { q });
        setResults(data.items || []);
      } catch (err) {
        setResults([]);
        setError(getApiErrorMessage(err, 'errors.generic'));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [conversationId, query]);

  return (
    <div className="msgSearchPanel">
      <div className="msgSearchPanel__row">
        <input
          type="search"
          className="msgSearchPanel__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('messenger.searchInChatPlaceholder')}
          aria-label={t('messenger.searchInChat')}
          autoFocus
        />
        <button
          type="button"
          className="msgSearchPanel__close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </div>
      {loading ? <p className="msgSearchPanel__hint">{t('common.loading')}</p> : null}
      {error ? <p className="msgSearchPanel__hint msgSearchPanel__hint--error">{error}</p> : null}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
        <p className="msgSearchPanel__hint">{t('messenger.searchNoResults')}</p>
      ) : null}
      <ul className="msgSearchPanel__list">
        {results.map((msg) => (
          <li key={msg.id}>
            <button
              type="button"
              className="msgSearchPanel__item"
              onClick={() => onSelectMessage?.(msg.id)}
            >
              <span className="msgSearchPanel__text">{msg.text || t('messenger.attachmentPreview')}</span>
              {msg.createdAt ? (
                <time className="msgSearchPanel__time" dateTime={msg.createdAt}>
                  {new Date(msg.createdAt).toLocaleString()}
                </time>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

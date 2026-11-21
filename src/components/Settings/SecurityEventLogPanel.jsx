import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatSessionCountryLabel } from '../../utils/formatSessionCountry';
import './SecurityEventLogPanel.scss';

const EVENT_I18N_KEY = {
  LOGIN_SUCCESS: 'loginSuccess',
  LOGIN_FAILED: 'loginFailed',
  MFA_ENABLED: 'mfaEnabled',
  MFA_DISABLED: 'mfaDisabled',
  PASSWORD_CHANGED: 'passwordChanged',
  LOGOUT_ALL: 'logoutAll',
  SESSION_REVOKED: 'sessionRevoked',
  MFA_RATE_LIMITED: 'mfaRateLimited',
};

function formatWhen(dateStr, t, locale) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return t('settings.security.securityLog.unknownTime');
  }
}

function deviceLine(event, t) {
  const parts = [event.browser, event.osName].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return t('settings.security.securityLog.unknownDevice');
}

export default function SecurityEventLogPanel() {
  const { t, i18n } = useTranslation();
  const uiLocale = i18n.resolvedLanguage || i18n.language;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (append = false, nextCursor = null) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const data = await authApi.listSecurityEvents({
          limit: 25,
          cursor: append ? nextCursor : null,
        });
        const batch = Array.isArray(data?.items) ? data.items : [];
        setItems((prev) => (append ? [...prev, ...batch] : batch));
        setCursor(data?.nextCursor ?? null);
      } catch (err) {
        toast.error(
          getApiErrorMessage(err) || t('settings.security.securityLog.loadError'),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div className="security-event-log">
      {loading ? (
        <p className="security-event-log__muted">
          {t('settings.security.securityLog.loading')}
        </p>
      ) : null}
      {!loading && items.length === 0 ? (
        <p className="security-event-log__muted">
          {t('settings.security.securityLog.empty')}
        </p>
      ) : null}
      <ul className="security-event-log__list">
        {items.map((ev) => {
          const typeKey = EVENT_I18N_KEY[ev.type] ?? 'unknown';
          const country = ev.countryCode
            ? formatSessionCountryLabel(ev.countryCode, uiLocale, t)
            : null;
          return (
            <li key={ev.id} className="security-event-log__item">
              <div className="security-event-log__head">
                <span className="security-event-log__type">
                  {t(`settings.security.securityLog.types.${typeKey}`)}
                </span>
                <time className="security-event-log__time" dateTime={ev.createdAt}>
                  {formatWhen(ev.createdAt, t, uiLocale)}
                </time>
              </div>
              <p className="security-event-log__meta">
                {deviceLine(ev, t)}
                {country ? (
                  <span className="security-event-log__country">
                    {t('settings.security.securityLog.countryApprox', {
                      country,
                    })}
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
      {cursor ? (
        <button
          type="button"
          className="security-event-log__more"
          disabled={loadingMore}
          onClick={() => void load(true, cursor)}
        >
          {loadingMore
            ? t('settings.security.securityLog.loadingMore')
            : t('settings.security.securityLog.loadMore')}
        </button>
      ) : null}
      <p className="security-event-log__footnote">
        {t('settings.security.securityLog.retentionNote')}
      </p>
    </div>
  );
}
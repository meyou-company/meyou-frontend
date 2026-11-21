import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './ActiveSessionsPanel.scss';

function formatRelative(dateStr, t) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return t('settings.security.sessions.lastActiveJustNow');
  if (mins < 60) {
    return t('settings.security.sessions.lastActiveMinutes', { count: mins });
  }
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    return t('settings.security.sessions.lastActiveHours', { count: hours });
  }
  const days = Math.floor(hours / 24);
  return t('settings.security.sessions.lastActiveDays', { count: days });
}

export default function ActiveSessionsPanel() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await authApi.listSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('settings.security.sessions.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (sessionId) => {
    if (!window.confirm(t('settings.security.sessions.revokeConfirm'))) return;
    try {
      setRevokingId(sessionId);
      await authApi.revokeSession(sessionId);
      toast.success(t('settings.security.sessions.revokeSuccess'));
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  };

  const toggleAlerts = async () => {
    const next = !loginAlerts;
    try {
      await authApi.updateLoginAlerts(next);
      setLoginAlerts(next);
      toast.success(
        next
          ? t('settings.security.sessions.alertsEnabled')
          : t('settings.security.sessions.alertsDisabled'),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="active-sessions">
      <button
        type="button"
        className="active-sessions__alerts settings-card__row"
        onClick={toggleAlerts}
        aria-pressed={loginAlerts}
      >
        <span>{t('settings.security.sessions.loginAlerts')}</span>
        <span
          className={`active-sessions__pill ${loginAlerts ? 'active-sessions__pill--on' : ''}`}
          aria-hidden
        />
      </button>

      {loading ? (
        <p className="active-sessions__muted">
          {t('settings.security.sessions.loading')}
        </p>
      ) : sessions.length === 0 ? (
        <p className="active-sessions__muted">
          {t('settings.security.sessions.empty')}
        </p>
      ) : (
        <ul className="active-sessions__list">
          {sessions.map((s) => (
            <li key={s.id} className="active-sessions__item">
              <div className="active-sessions__meta">
                <span className="active-sessions__title">
                  {[s.browser, s.osName].filter(Boolean).join(' · ') ||
                    t('settings.security.sessions.unknownDevice')}
                  {s.isCurrent ? (
                    <span className="active-sessions__badge">
                      {t('settings.security.sessions.thisDevice')}
                    </span>
                  ) : null}
                </span>
                <span className="active-sessions__desc">
                  {s.countryCode
                    ? t('settings.security.sessions.country', {
                        code: s.countryCode,
                      })
                    : t('settings.security.sessions.countryUnknown')}
                  {' · '}
                  {formatRelative(s.lastSeenAt, t)}
                </span>
              </div>
              {!s.isCurrent ? (
                <button
                  type="button"
                  className="active-sessions__revoke"
                  disabled={revokingId === s.id}
                  onClick={() => handleRevoke(s.id)}
                >
                  {t('settings.security.sessions.revoke')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
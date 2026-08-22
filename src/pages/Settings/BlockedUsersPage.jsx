import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';
import { usersApi } from '../../services/usersApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './BlockedUsersPage.scss';

function extractBlockedUsers(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.blockedUsers)) return response.blockedUsers;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data?.users)) return response.data.users;
  if (Array.isArray(response.data?.blockedUsers)) return response.data.blockedUsers;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function getBlockedUserId(user) {
  return (
    user?.id ||
    user?._id ||
    user?.blockedUser?.id ||
    user?.blockedUserId ||
    user?.userId ||
    null
  );
}

function getDisplayName(user) {
  const full = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  if (full) return full;
  if (user?.name?.trim()) return user.name.trim();
  if (user?.username) return user.username;
  return '';
}

function getUsername(user) {
  const username = String(user?.username || '').trim();
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

function getAvatarUrl(user) {
  return user?.avatarUrl || user?.avatar || user?.photoUrl || null;
}

export default function BlockedUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);

  const loadBlockedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.getBlockedUsers();
      const list = extractBlockedUsers(response)
        .map((item) => item?.blockedUser || item?.user || item?.blocked || item)
        .filter((item) => getBlockedUserId(item));
      setUsers(list);
    } catch (err) {
      console.error('[blocked-users] load failed', err?.response?.data || err);
      setUsers([]);
      setError(getApiErrorMessage(err) || t('settings.blocked.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async (user) => {
    const userId = getBlockedUserId(user);
    if (!userId || unblockingId) return;

    setUnblockingId(String(userId));
    try {
      await usersApi.unblockUser(userId);
      setUsers((prev) =>
        prev.filter((item) => String(getBlockedUserId(item)) !== String(userId)),
      );
      toast.success(t('settings.blocked.unblocked'));
    } catch (err) {
      console.error('[blocked-users] unblock failed', err?.response?.data || err);
      toast.error(getApiErrorMessage(err) || t('settings.blocked.unblockError'));
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <SettingsPageShell
      title={t('settings.blocked.title')}
      subtitle={t('settings.blocked.subtitle')}
      onBack={() => navigate(-1)}
      className="blocked-users-page"
    >
      {loading ? (
        <p className="blocked-users-page__status">{t('settings.blocked.loading')}</p>
      ) : null}

      {!loading && error ? (
        <div className="blocked-users-page__state">
          <p className="blocked-users-page__stateTitle">{error}</p>
          <button
            type="button"
            className="blocked-users-page__retry"
            onClick={() => void loadBlockedUsers()}
          >
            {t('settings.blocked.retry')}
          </button>
        </div>
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <div className="blocked-users-page__state">
          <p className="blocked-users-page__stateTitle">{t('settings.blocked.empty')}</p>
          <p className="blocked-users-page__stateDesc">
            {t('settings.blocked.emptyDescription')}
          </p>
        </div>
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <ul className="blocked-users-page__list settings-card">
          {users.map((user) => {
            const userId = getBlockedUserId(user);
            const name = getDisplayName(user) || t('settings.blocked.unknownUser');
            const username = getUsername(user);
            const avatarUrl = getAvatarUrl(user);
            const isUnblocking = String(unblockingId) === String(userId);

            return (
              <li key={String(userId)} className="blocked-users-page__item">
                <div className="blocked-users-page__user">
                  <div className="blocked-users-page__avatar" aria-hidden="true">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" />
                    ) : (
                      <span>{name.charAt(0).toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="blocked-users-page__meta">
                    <span className="blocked-users-page__name">{name}</span>
                    {username ? (
                      <span className="blocked-users-page__username">{username}</span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="blocked-users-page__unblock"
                  disabled={isUnblocking}
                  onClick={() => void handleUnblock(user)}
                >
                  {isUnblocking
                    ? t('settings.blocked.unblocking')
                    : t('settings.blocked.unblock')}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SettingsPageShell>
  );
}

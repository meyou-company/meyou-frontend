import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '../../services/conversationsApi';
import { subscriptionsApi } from '../../services/subscriptionsApi';
import { usersApi } from '../../services/usersApi';
import { uploadMessageMedia } from '../../services/messageMediaUploadApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getMemberDisplayName } from '../../utils/conversationPreview';
import GroupAvatar from './GroupAvatar';
import './CreateGroupModal.scss';

function extractUsers(payload) {
  const data = payload?.data?.data || payload?.data || payload || {};
  const items = Array.isArray(data)
    ? data
    : data.items || data.users || data.results || data.following || [];

  return items
    .map((item) => item.user || item.following || item.targetUser || item)
    .filter((user) => user?.id || user?._id || user?.userId);
}

function getUserId(user) {
  return user?.id || user?._id || user?.userId;
}

export default function CreateGroupModal({ isOpen, currentUserId, onClose, onCreated }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setName('');
      setAvatarUrl('');
      setQuery('');
      setFriends([]);
      setResults([]);
      setSelected(new Map());
      setSubmitting(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    subscriptionsApi
      .getFollowing({ take: 200 })
      .then((response) => {
        if (cancelled) return;
        setFriends(
          extractUsers(response).filter(
            (user) => String(getUserId(user)) !== String(currentUserId),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      usersApi
        .search({ q: query.trim() })
        .then((response) => {
          if (cancelled) return;
          setResults(
            extractUsers(response).filter(
              (user) => String(getUserId(user)) !== String(currentUserId),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, query, currentUserId]);

  const selectedUsers = useMemo(() => [...selected.values()], [selected]);
  const visibleUsers = query.trim() ? results : friends;

  const toggleUser = (user) => {
    const id = getUserId(user);
    if (!id) return;
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, user);
      return next;
    });
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMessageMedia(file);
      setAvatarUrl(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (!name.trim()) {
      toast.error(t('messenger.group.nameRequired'));
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t('messenger.group.nameRequired'));
      return;
    }
    if (!selectedUsers.length) {
      toast.error(t('messenger.group.membersRequired'));
      return;
    }
    try {
      setSubmitting(true);
      const created = await conversationsApi.createGroup({
        name: name.trim(),
        avatarUrl: avatarUrl || undefined,
        memberIds: selectedUsers.map((user) => getUserId(user)),
      });
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="msgModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="msgModal groupCreateModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="msgModal__head">
          <h2 id="create-group-title">
            {step === 1 ? t('messenger.group.stepName') : t('messenger.group.stepMembers')}
          </h2>
          <button
            type="button"
            className="msgModal__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </header>

        {step === 1 ? (
          <div className="groupCreateModal__step">
            <button
              type="button"
              className="groupCreateModal__avatarBtn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <GroupAvatar src={avatarUrl} name={name} />
              <span>{uploading ? t('messenger.uploading') : t('messenger.group.addPhoto')}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="groupCreateModal__file"
              onChange={handleAvatarChange}
            />
            <label className="msgModal__label">
              {t('messenger.group.nameLabel')}
              <input
                type="text"
                className="groupCreateModal__input"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('messenger.group.namePlaceholder')}
              />
            </label>
            <button
              type="button"
              className="msgModal__submit"
              onClick={handleNext}
              disabled={!name.trim()}
            >
              {t('messenger.group.next')}
            </button>
          </div>
        ) : (
          <div className="groupCreateModal__step">
            {selectedUsers.length > 0 ? (
              <ul className="groupCreateModal__chips">
                {selectedUsers.map((user) => {
                  const id = getUserId(user);
                  const label = getMemberDisplayName(user, t('common.user'));
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="groupCreateModal__chip"
                        onClick={() => toggleUser(user)}
                      >
                        <span className="msgModal__avatar">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : label.charAt(0).toUpperCase()}
                        </span>
                        <span>{label}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <label className="messagesPage__searchWrap groupCreateModal__search">
              <input
                type="search"
                className="messagesPage__search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('messenger.group.searchMembers')}
                aria-label={t('messenger.group.searchMembers')}
              />
            </label>

            {loading ? <p className="msgModal__hint">{t('common.loading')}</p> : null}

            <ul className="msgModal__list groupCreateModal__list">
              {visibleUsers.map((user) => {
                const id = getUserId(user);
                const label = getMemberDisplayName(user, t('common.user'));
                const checked = selected.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`msgModal__listBtn groupCreateModal__member${checked ? ' is-selected' : ''}`}
                      onClick={() => toggleUser(user)}
                    >
                      <span className="groupCreateModal__radio" aria-hidden="true">
                        {checked ? '●' : '○'}
                      </span>
                      <span className="msgModal__avatar">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : label.charAt(0).toUpperCase()}
                      </span>
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="groupCreateModal__actions">
              <button type="button" className="groupCreateModal__back" onClick={() => setStep(1)}>
                {t('common.back')}
              </button>
              <button
                type="button"
                className="msgModal__submit"
                onClick={() => void handleCreate()}
                disabled={submitting || selectedUsers.length === 0}
              >
                {t('messenger.group.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

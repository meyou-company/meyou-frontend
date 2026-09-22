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
import './GroupInfoModal.scss';

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

function roleRank(role) {
  if (role === 'OWNER') return 0;
  if (role === 'ADMIN') return 1;
  return 2;
}

export default function GroupInfoModal({
  isOpen,
  conversation,
  currentUserId,
  onClose,
  onUpdated,
  onLeft,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [view, setView] = useState('info');
  const [nameDraft, setNameDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const members = useMemo(() => {
    const rows = Array.isArray(conversation?.members) ? conversation.members : [];
    return [...rows].sort((a, b) => roleRank(a.role) - roleRank(b.role));
  }, [conversation]);

  const myRole = conversation?.myRole || 'MEMBER';
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner = myRole === 'OWNER';
  const existingIds = useMemo(
    () => new Set(members.map((m) => String(m.id))),
    [members],
  );

  useEffect(() => {
    if (!isOpen) {
      setView('info');
      setEditingName(false);
      setQuery('');
      setPicked(new Map());
      return;
    }
    setNameDraft(conversation?.name || '');
  }, [isOpen, conversation?.name]);

  useEffect(() => {
    if (!isOpen || view !== 'add') return undefined;
    let cancelled = false;
    setLoading(true);
    subscriptionsApi
      .getFollowing({ take: 200 })
      .then((response) => {
        if (cancelled) return;
        setFriends(
          extractUsers(response).filter((user) => {
            const id = String(getUserId(user));
            return id && id !== String(currentUserId) && !existingIds.has(id);
          }),
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
  }, [isOpen, view, currentUserId, existingIds]);

  useEffect(() => {
    if (!isOpen || view !== 'add' || !query.trim()) {
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
            extractUsers(response).filter((user) => {
              const id = String(getUserId(user));
              return id && id !== String(currentUserId) && !existingIds.has(id);
            }),
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
  }, [isOpen, view, query, currentUserId, existingIds]);

  if (!isOpen || !conversation) return null;

  const title = conversation.name?.trim() || t('messenger.group.untitled');
  const visibleUsers = query.trim() ? results : friends;
  const pickedUsers = [...picked.values()];

  const applyUpdate = (next) => {
    onUpdated?.(next);
  };

  const handleSaveName = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      toast.error(t('messenger.group.nameRequired'));
      return;
    }
    try {
      setBusy(true);
      const updated = await conversationsApi.updateGroup(conversation.id, {
        name: nextName,
      });
      applyUpdate(updated);
      setEditingName(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      const url = await uploadMessageMedia(file);
      const updated = await conversationsApi.updateGroup(conversation.id, {
        avatarUrl: url,
      });
      applyUpdate(updated);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const handleAddMembers = async () => {
    if (!pickedUsers.length) {
      toast.error(t('messenger.group.membersRequired'));
      return;
    }
    try {
      setBusy(true);
      const updated = await conversationsApi.addGroupMembers(
        conversation.id,
        pickedUsers.map((user) => getUserId(user)),
      );
      applyUpdate(updated);
      toast.success(t('messenger.group.memberAdded'));
      setPicked(new Map());
      setView('info');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member) => {
    const ok = window.confirm(
      t('messenger.group.removeConfirm', {
        name: getMemberDisplayName(member, t('common.user')),
      }),
    );
    if (!ok) return;
    try {
      setBusy(true);
      const updated = await conversationsApi.removeGroupMember(
        conversation.id,
        member.id,
      );
      applyUpdate(updated);
      toast.success(t('messenger.group.memberRemoved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRole = async (member, role) => {
    const key =
      role === 'ADMIN'
        ? 'messenger.group.makeAdminConfirm'
        : 'messenger.group.removeAdminConfirm';
    const ok = window.confirm(
      t(key, { name: getMemberDisplayName(member, t('common.user')) }),
    );
    if (!ok) return;
    try {
      setBusy(true);
      const updated = await conversationsApi.updateGroupMemberRole(
        conversation.id,
        member.id,
        role,
      );
      applyUpdate(updated);
      toast.success(t('messenger.group.roleUpdated'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    const ok = window.confirm(t('messenger.group.leaveConfirm'));
    if (!ok) return;
    try {
      setBusy(true);
      await conversationsApi.leaveGroup(conversation.id);
      toast.success(t('messenger.group.leaveSuccess'));
      onLeft?.(conversation.id);
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      setBusy(false);
    }
  };

  const canRemove = (member) => {
    if (!canManage) return false;
    if (String(member.id) === String(currentUserId)) return false;
    if (member.role === 'OWNER') return false;
    if (member.role === 'ADMIN' && !isOwner) return false;
    return true;
  };

  const roleLabel = (role) => {
    if (role === 'OWNER') return t('messenger.group.owner');
    if (role === 'ADMIN') return t('messenger.group.admin');
    return '';
  };

  return (
    <div className="msgModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="msgModal groupInfoModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="msgModal__head">
          <h2 id="group-info-title">
            {view === 'add' ? t('messenger.group.addMembers') : t('messenger.group.info')}
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

        {view === 'add' ? (
          <div className="groupInfoModal__body">
            <label className="messagesPage__searchWrap groupInfoModal__search">
              <input
                type="search"
                className="messagesPage__search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('messenger.group.searchMembers')}
              />
            </label>
            {loading ? <p className="msgModal__hint">{t('common.loading')}</p> : null}
            <ul className="msgModal__list">
              {visibleUsers.map((user) => {
                const id = getUserId(user);
                const label = getMemberDisplayName(user, t('common.user'));
                const checked = picked.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`msgModal__listBtn${checked ? ' is-selected' : ''}`}
                      onClick={() => {
                        setPicked((current) => {
                          const next = new Map(current);
                          if (next.has(id)) next.delete(id);
                          else next.set(id, user);
                          return next;
                        });
                      }}
                    >
                      <span className="msgModal__avatar">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : label.charAt(0)}
                      </span>
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="groupInfoModal__actions">
              <button type="button" className="groupInfoModal__ghost" onClick={() => setView('info')}>
                {t('common.back')}
              </button>
              <button
                type="button"
                className="msgModal__submit"
                disabled={busy || pickedUsers.length === 0}
                onClick={() => void handleAddMembers()}
              >
                {t('messenger.group.addMembers')}
              </button>
            </div>
          </div>
        ) : (
          <div className="groupInfoModal__body">
            <div className="groupInfoModal__hero">
              <GroupAvatar src={conversation.avatarUrl} name={title} />
              {editingName ? (
                <div className="groupInfoModal__nameEdit">
                  <input
                    className="groupInfoModal__input"
                    value={nameDraft}
                    maxLength={80}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                  <button type="button" className="msgModal__submit" disabled={busy} onClick={() => void handleSaveName()}>
                    {t('common.save')}
                  </button>
                </div>
              ) : (
                <>
                  <h3>{title}</h3>
                  <p>
                    {t('messenger.group.membersCount', {
                      count: conversation.memberCount || members.length,
                    })}
                  </p>
                </>
              )}
            </div>

            <ul className="groupInfoModal__members">
              {members.map((member) => {
                const label = getMemberDisplayName(member, t('common.user'));
                const role = roleLabel(member.role);
                return (
                  <li key={member.id} className="groupInfoModal__member">
                    <span className="msgModal__avatar">
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : label.charAt(0)}
                    </span>
                    <div className="groupInfoModal__memberMeta">
                      <strong>{label}</strong>
                      {role ? <span>{role}</span> : null}
                    </div>
                    <div className="groupInfoModal__memberActions">
                      {isOwner && member.role === 'MEMBER' ? (
                        <button type="button" disabled={busy} onClick={() => void handleRole(member, 'ADMIN')}>
                          {t('messenger.group.makeAdmin')}
                        </button>
                      ) : null}
                      {isOwner && member.role === 'ADMIN' ? (
                        <button type="button" disabled={busy} onClick={() => void handleRole(member, 'MEMBER')}>
                          {t('messenger.group.removeAdmin')}
                        </button>
                      ) : null}
                      {canRemove(member) ? (
                        <button
                          type="button"
                          className="is-danger"
                          disabled={busy}
                          onClick={() => void handleRemove(member)}
                        >
                          {t('messenger.group.removeMember')}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="groupInfoModal__controls">
              {canManage ? (
                <>
                  <button type="button" onClick={() => setView('add')}>
                    {t('messenger.group.addMembers')}
                  </button>
                  <button type="button" onClick={() => setEditingName(true)}>
                    {t('messenger.group.changeName')}
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                    {t('messenger.group.changeAvatar')}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="groupInfoModal__file"
                    onChange={handleAvatar}
                  />
                </>
              ) : null}
              <button type="button" className="is-danger" onClick={() => void handleLeave()} disabled={busy}>
                {t('messenger.group.leave')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

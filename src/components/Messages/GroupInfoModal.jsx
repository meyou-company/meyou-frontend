import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  LuCamera,
  LuImage,
  LuLogOut,
  LuPencil,
  LuPlus,
  LuShield,
  LuTrash2,
  LuUser,
} from 'react-icons/lu';
import { toast } from 'sonner';
import { conversationsApi } from '../../services/conversationsApi';
import { subscriptionsApi } from '../../services/subscriptionsApi';
import { usersApi } from '../../services/usersApi';
import { uploadMessageMedia } from '../../services/messageMediaUploadApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getMemberDisplayName } from '../../utils/conversationPreview';
import GroupAvatar from './GroupAvatar';
import './ChatContextMenu.scss';
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

function computeMenuPosition(anchorRect, menuSize) {
  const pad = 12;
  const gap = 8;
  const { width: menuW, height: menuH } = menuSize;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = anchorRect.bottom + gap;
  let left = anchorRect.right - menuW;

  if (top + menuH > viewportH - pad) {
    top = anchorRect.top - menuH - gap;
  }
  if (left + menuW > viewportW - pad) {
    left = viewportW - menuW - pad;
  }
  if (left < pad) left = pad;
  if (top < pad) top = pad;

  return { top, left };
}

function MemberActionsMenu({ isOpen, anchorRect, items, label, onClose, onAction }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRect || !menuRef.current) {
      setReady(false);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    setPosition(computeMenuPosition(anchorRect, rect));
    setReady(true);
    const first = menuRef.current.querySelector('[role="menuitem"]');
    first?.focus();
  }, [isOpen, anchorRect]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };

    const onScrollOrResize = () => onClose?.();

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  return createPortal(
    <div
      className="chatContextMenuOverlay groupInfoModal__menuOverlay"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={menuRef}
        className={`chatContextMenu groupInfoModal__menu${ready ? ' is-ready' : ''}`}
        style={{ top: position.top, left: position.left }}
        role="menu"
        aria-label={label}
      >
        <ul className="chatContextMenu__list">
          {items.map(({ id, Icon, label: itemLabel, danger }) => (
            <li key={id}>
              <button
                type="button"
                role="menuitem"
                className={`chatContextMenu__item${danger ? ' chatContextMenu__item--danger' : ''}`}
                onClick={() => onAction?.(id)}
              >
                <span className="chatContextMenu__icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{itemLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export default function GroupInfoModal({
  isOpen,
  conversation,
  currentUserId,
  onClose,
  onUpdated,
  onLeft,
  onDeleted,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const deletingRef = useRef(false);
  const [view, setView] = useState('info');
  const [nameDraft, setNameDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [memberMenu, setMemberMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setMemberMenu(null);
      setConfirmDelete(false);
      deletingRef.current = false;
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

  const handleDeleteGroup = async () => {
    if (!conversation?.id || deletingRef.current) return;
    deletingRef.current = true;
    try {
      setBusy(true);
      await conversationsApi.deleteGroup(conversation.id);
      toast.success(t('messenger.group.deleteSuccess'));
      setConfirmDelete(false);
      onClose?.();
      onDeleted?.(conversation.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.group.updateError'));
    } finally {
      deletingRef.current = false;
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
    return t('messenger.group.member');
  };

  const memberActions = (member) => {
    const items = [];
    if (isOwner && member.role === 'MEMBER') {
      items.push({
        id: 'makeAdmin',
        Icon: LuShield,
        label: t('messenger.group.makeAdmin'),
      });
    }
    if (isOwner && member.role === 'ADMIN') {
      items.push({
        id: 'makeMember',
        Icon: LuUser,
        label: t('messenger.group.makeMember'),
      });
    }
    if (canRemove(member)) {
      items.push({
        id: 'remove',
        Icon: LuTrash2,
        label: t('messenger.group.removeMember'),
        danger: true,
      });
    }
    return items;
  };

  const openMemberMenu = (event, member) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMemberMenu({
      member,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const handleMemberMenuAction = (actionId) => {
    const member = memberMenu?.member;
    setMemberMenu(null);
    if (!member) return;
    if (actionId === 'makeAdmin') {
      void handleRole(member, 'ADMIN');
      return;
    }
    if (actionId === 'makeMember') {
      void handleRole(member, 'MEMBER');
      return;
    }
    if (actionId === 'remove') {
      void handleRemove(member);
    }
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
            <ul className="msgModal__list groupInfoModal__addList">
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
                      <span className="groupInfoModal__addName">{label}</span>
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
              <div className="groupInfoModal__avatarWrap">
                <GroupAvatar src={conversation.avatarUrl} name={title} />
                {canManage ? (
                  <button
                    type="button"
                    className="groupInfoModal__camera"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    aria-label={t('messenger.group.changeAvatar')}
                  >
                    <LuCamera size={14} />
                  </button>
                ) : null}
              </div>
              {editingName ? (
                <div className="groupInfoModal__nameEdit">
                  <input
                    className="groupInfoModal__input"
                    value={nameDraft}
                    maxLength={80}
                    onChange={(e) => setNameDraft(e.target.value)}
                    aria-label={t('messenger.group.nameLabel')}
                  />
                  <button
                    type="button"
                    className="msgModal__submit"
                    disabled={busy}
                    onClick={() => void handleSaveName()}
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    className="groupInfoModal__ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNameDraft(conversation?.name || '');
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="groupInfoModal__title">{title}</h3>
                  <p className="groupInfoModal__count">
                    {t('messenger.group.membersCount', {
                      count: conversation.memberCount || members.length,
                    })}
                  </p>
                </>
              )}
            </div>

            <div className="groupInfoModal__divider" />

            <div className="groupInfoModal__sectionHead">
              <h3>{t('messenger.group.members')}</h3>
              {canManage ? (
                <button
                  type="button"
                  className="groupInfoModal__addBtn"
                  onClick={() => {
                    setMemberMenu(null);
                    setView('add');
                  }}
                >
                  {t('messenger.group.addMembers')}
                  <LuPlus size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <ul className="groupInfoModal__members">
              {members.map((member) => {
                const label = getMemberDisplayName(member, t('common.user'));
                const role = roleLabel(member.role);
                const isMemberOwner = member.role === 'OWNER';
                const actions = memberActions(member);
                return (
                  <li key={member.id} className="groupInfoModal__member">
                    <span className="msgModal__avatar groupInfoModal__memberAvatar">
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : label.charAt(0)}
                    </span>
                    <div className="groupInfoModal__memberMeta">
                      <strong className="groupInfoModal__memberName" title={label}>
                        {label}
                      </strong>
                      <span className="groupInfoModal__memberRole">{role}</span>
                    </div>
                    {isMemberOwner ? (
                      <span
                        className="groupInfoModal__crown"
                        aria-label={t('messenger.group.owner')}
                        title={t('messenger.group.owner')}
                      >
                        👑
                      </span>
                    ) : actions.length ? (
                      <button
                        type="button"
                        className="groupInfoModal__kebab"
                        aria-haspopup="menu"
                        aria-expanded={
                          String(memberMenu?.member?.id) === String(member.id)
                        }
                        aria-label={t('messenger.group.memberMenu')}
                        disabled={busy}
                        onClick={(e) => openMemberMenu(e, member)}
                      >
                        ⋮
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {canManage ? (
              <>
                <div className="groupInfoModal__divider" />
                <div className="groupInfoModal__sectionHead">
                  <h3>{t('messenger.group.manage')}</h3>
                </div>
                <div className="groupInfoModal__manageRow">
                  <button
                    type="button"
                    className="groupInfoModal__manageBtn"
                    onClick={() => setEditingName(true)}
                  >
                    <LuPencil size={16} aria-hidden="true" />
                    {t('messenger.group.changeName')}
                  </button>
                  <button
                    type="button"
                    className="groupInfoModal__manageBtn"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                  >
                    <LuImage size={16} aria-hidden="true" />
                    {t('messenger.group.changeAvatar')}
                  </button>
                </div>
              </>
            ) : (
              <div className="groupInfoModal__divider" />
            )}

            <div className="groupInfoModal__footerActions">
              <button
                type="button"
                className="groupInfoModal__leave"
                onClick={() => void handleLeave()}
                disabled={busy}
              >
                <LuLogOut size={16} aria-hidden="true" />
                {t('messenger.group.leave')}
              </button>
              {isOwner ? (
                <button
                  type="button"
                  className="groupInfoModal__deleteGroup"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  <LuTrash2 size={16} aria-hidden="true" />
                  {t('messenger.group.delete')}
                </button>
              ) : null}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="groupInfoModal__file"
              onChange={handleAvatar}
            />
          </div>
        )}
      </div>

      <MemberActionsMenu
        isOpen={Boolean(memberMenu)}
        anchorRect={memberMenu?.anchorRect}
        items={memberMenu?.member ? memberActions(memberMenu.member) : []}
        label={t('messenger.group.memberMenu')}
        onClose={() => setMemberMenu(null)}
        onAction={handleMemberMenuAction}
      />

      {confirmDelete
        ? createPortal(
            <div
              className="groupDeleteConfirmOverlay"
              role="presentation"
              onClick={() => {
                if (!busy) setConfirmDelete(false);
              }}
            >
              <div
                className="groupDeleteConfirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="group-delete-title"
                aria-describedby="group-delete-desc"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="group-delete-title" className="groupDeleteConfirm__title">
                  {t('messenger.group.deleteConfirmTitle')}
                </h2>
                <p id="group-delete-desc" className="groupDeleteConfirm__desc">
                  {t('messenger.group.deleteConfirmBody', {
                    name: title,
                  })}
                </p>
                <div className="groupDeleteConfirm__actions">
                  <button
                    type="button"
                    className="groupDeleteConfirm__cancel"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="groupDeleteConfirm__confirm"
                    onClick={() => void handleDeleteGroup()}
                    disabled={busy}
                  >
                    {busy
                      ? t('messenger.group.deleting')
                      : t('messenger.group.delete')}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

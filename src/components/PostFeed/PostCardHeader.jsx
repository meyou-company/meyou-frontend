import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import { RepostHeaderIcon } from './RepostUi';
import { formatRelativeTime } from '../../utils/formatPostTime';
import './PostCardHeader.scss';

function PostFeedActionMenu({
  canShowMenu,
  canEdit,
  canDelete,
  canRemoveFromFeed,
  onEdit,
  onDelete,
  onRemoveFromFeed,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!canShowMenu) return null;

  const menuAria = t('posts.menu.actionsAria');

  return (
    <div
      className="postFeedMenuWrap"
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="postFeedMenuBtn"
        aria-label={menuAria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="postFeedMenuDropdown" role="menu" aria-label={menuAria}>
          {canEdit && (
            <button
              type="button"
              className="postFeedMenuItem"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit?.();
              }}
            >
              <span className="postFeedMenuItem__icon" aria-hidden="true">
                ✏️
              </span>
              {t('posts.menu.edit')}
            </button>
          )}
          {canRemoveFromFeed && (
            <button
              type="button"
              className="postFeedMenuItem postFeedMenuItem--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRemoveFromFeed?.();
              }}
            >
              <span className="postFeedMenuItem__icon" aria-hidden="true">
                🗑
              </span>
              {t('posts.menu.removeFromFeed')}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="postFeedMenuItem postFeedMenuItem--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete?.();
              }}
            >
              <span className="postFeedMenuItem__icon" aria-hidden="true">
                🗑
              </span>
              {t('posts.menu.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostCardHeader({
  avatarSrc,
  onAvatarClick,
  avatarDisabled = false,
  avatarAriaLabel,
  authorName,
  createdAt,
  location,
  showRepostIcon = false,
  canShowMenu = false,
  canEdit = false,
  canDelete = false,
  canRemoveFromFeed = false,
  onEdit,
  onDeleteRequest,
  onRemoveFromFeedRequest,
  variant = 'profile',
}) {
  const { t } = useTranslation();
  const timeLabel = formatRelativeTime(createdAt, t);
  const locationText = (location ?? '').trim() || '—';
  const rootClass = [
    'postCardHeader',
    variant === 'firstPage' ? 'postCardHeader--firstPage' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={rootClass}>
      <div className="postCardHeader__left">
        <button
          type="button"
          className="postCardHeader__avatarBtn"
          disabled={avatarDisabled}
          onClick={onAvatarClick}
          aria-label={avatarAriaLabel ?? t('posts.actions.authorAria')}
        >
          <img src={avatarSrc} className="postCardHeader__avatar" alt="" />
        </button>
        <div className="postCardHeader__author">
          <div className="postCardHeader__nameLine">
            <div className="postCardHeader__nameBlock">
              <span className="postCardHeader__name">{authorName}</span>
              {showRepostIcon ? <RepostHeaderIcon /> : null}
            </div>
          </div>
          {timeLabel ? (
            <time
              className="postCardHeader__time"
              dateTime={createdAt || undefined}
              title={createdAt ? new Date(createdAt).toLocaleString() : ''}
            >
              {timeLabel}
            </time>
          ) : null}
        </div>
      </div>

      <div className="postCardHeader__aside">
        <PostFeedActionMenu
          canShowMenu={canShowMenu}
          canEdit={canEdit}
          canDelete={canDelete}
          canRemoveFromFeed={canRemoveFromFeed}
          onEdit={onEdit}
          onDelete={onDeleteRequest}
          onRemoveFromFeed={onRemoveFromFeedRequest ?? onDeleteRequest}
        />
        <div className="postCardHeader__location">
          <img
            className="postCardHeader__locationIcon"
            src={profileIcons.location || '/home/location.svg'}
            alt=""
          />
          <span className="postCardHeader__locationText">{locationText}</span>
        </div>
      </div>
    </header>
  );
}

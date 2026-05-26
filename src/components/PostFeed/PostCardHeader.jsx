import { useEffect, useRef, useState } from "react";
import profileIcons from "../../constants/profileIcons";
import { RepostHeaderIcon } from "./RepostUi";
import { formatPostTime } from "../../utils/formatPostTime";
import "./PostCardHeader.scss";

function PostFeedActionMenu({
  canShowMenu,
  canEdit,
  canDelete,
  canRemoveFromFeed,
  onEdit,
  onDelete,
  onRemoveFromFeed,
}) {
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
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canShowMenu) return null;

  return (
    <div
      className="postFeedMenuWrap"
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="postFeedMenuBtn"
        aria-label="Дії з дописом"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div
          className="postFeedMenuDropdown"
          role="menu"
          aria-label="Дії з дописом"
        >
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
              Редагувати пост
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
              Прибрати зі стрічки
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
              Видалити пост
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Шапка картки поста: автор зліва, ⋯ у верхньому правому куті, локація під ним.
 */
export default function PostCardHeader({
  avatarSrc,
  onAvatarClick,
  avatarDisabled = false,
  avatarAriaLabel = "Автор допису",
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
  variant = "profile",
}) {
  const timeLabel = formatPostTime(createdAt);
  const locationText = (location ?? "").trim() || "—";
  const rootClass = [
    "postCardHeader",
    variant === "firstPage" ? "postCardHeader--firstPage" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={rootClass}>
      <div className="postCardHeader__left">
        <button
          type="button"
          className="postCardHeader__avatarBtn"
          disabled={avatarDisabled}
          onClick={onAvatarClick}
          aria-label={avatarAriaLabel}
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
              title={createdAt ? new Date(createdAt).toLocaleString() : ""}
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
            src={profileIcons.location || "/home/location.svg"}
            alt=""
          />
          <span className="postCardHeader__locationText">{locationText}</span>
        </div>
      </div>
    </header>
  );
}

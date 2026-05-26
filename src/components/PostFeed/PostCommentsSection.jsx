import { useState } from "react";
import profileIcons from "../../constants/profileIcons";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useUserProfileNav } from "../../context/UserProfileNavContext";
import { getProfileRouteHandle } from "../../utils/profileFriendNav";
import CommentComposer from "./CommentComposer";
import CommentActionMenu from "./CommentActionMenu";
import "./PostCommentsSection.scss";
import "./CommentActionMenu.scss";

const VISIBLE_REPLIES_DEFAULT = 2;

/** Як у Facebook: короткий відносний час або дата. */
function formatCommentWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "щойно";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} хв`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} год`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} д`;
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year:
        d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function commentDisplayName(c) {
  const a = c?.author;
  if (!a) return "User";
  const full = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (a.username) return a.username;
  return "User";
}

function commentAvatarSrc(c) {
  return c?.author?.avatarUrl || profileIcons.userStory;
}

function repliesLabel(count) {
  const n = Number(count) || 0;
  if (n === 1) return "1 відповідь";
  if (n >= 2 && n <= 4) return `${n} відповіді`;
  return `${n} відповідей`;
}

function canManageComment(comment, currentUserId) {
  return Boolean(
    currentUserId &&
      comment?.id &&
      String(comment?.author?.id ?? "") === String(currentUserId)
  );
}

function CommentBubble({
  comment,
  currentUserId,
  profileNav,
  onDeleteComment,
  onEditComment,
  showReplyAction = false,
  repliesCount = 0,
  onReplyClick,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.content ?? "");

  const authorHandle = comment?.author
    ? getProfileRouteHandle(comment.author)
    : null;
  const canOpenAuthor = Boolean(authorHandle && profileNav?.openProfile);
  const goAuthor = () => {
    if (canOpenAuthor) profileNav.openProfile(comment.author);
  };
  const canManage = canManageComment(comment, currentUserId);

  const startEdit = () => {
    setEditDraft(comment.content ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditDraft(comment.content ?? "");
    setIsEditing(false);
  };

  const saveEdit = () => {
    const text = (editDraft ?? "").trim();
    if (!text) return;
    onEditComment?.(comment.id, text, {
      isReply: comment.isReply,
      parentId: comment.parentId,
    });
    setIsEditing(false);
  };

  return (
    <>
      <div className="postCommentsSection__bubble">
        <div className="postCommentsSection__bubbleHead">
          <div className="postCommentsSection__bubbleMeta">
            <button
              type="button"
              className="postCommentsSection__nameBtn"
              disabled={!canOpenAuthor}
              onClick={goAuthor}
            >
              {commentDisplayName(comment)}
            </button>
            <span
              className="postCommentsSection__when"
              title={
                comment.createdAt
                  ? new Date(comment.createdAt).toLocaleString()
                  : ""
              }
            >
              {formatCommentWhen(comment.createdAt)}
            </span>
          </div>
          {canManage && !isEditing && (
            <CommentActionMenu
              onEdit={startEdit}
              onDelete={() =>
                onDeleteComment?.(comment.id, {
                  isReply: comment.isReply,
                  parentId: comment.parentId,
                })
              }
            />
          )}
        </div>
        {isEditing ? (
          <div className="postCommentsSection__editComposer">
            <CommentComposer
              compact
              value={editDraft}
              onChange={setEditDraft}
              onSubmit={saveEdit}
              placeholder="Редагувати коментар…"
              ariaLabel="Редагування коментаря"
              sendAriaLabel="Зберегти"
            />
            <button
              type="button"
              className="postCommentsSection__editCancel"
              onClick={cancelEdit}
            >
              Скасувати
            </button>
          </div>
        ) : (
          <p className="postCommentsSection__text">{comment.content}</p>
        )}
      </div>
      {(showReplyAction || repliesCount > 0) && (
        <div className="postCommentsSection__commentActions">
          {showReplyAction && (
            <button
              type="button"
              className="postCommentsSection__replyBtn"
              onClick={onReplyClick}
            >
              Відповісти
            </button>
          )}
          {repliesCount > 0 && (
            <span className="postCommentsSection__repliesStat">
              {repliesLabel(repliesCount)}
            </span>
          )}
        </div>
      )}
    </>
  );
}

function ReplyRow({
  reply,
  currentUserId,
  profileNav,
  onDeleteComment,
  onEditComment,
}) {
  const authorHandle = reply?.author
    ? getProfileRouteHandle(reply.author)
    : null;
  const canOpenAuthor = Boolean(authorHandle && profileNav?.openProfile);
  const goAuthor = () => {
    if (canOpenAuthor) profileNav.openProfile(reply.author);
  };

  return (
    <li className="postCommentsSection__replyRow">
      <button
        type="button"
        className="postCommentsSection__avatarBtn postCommentsSection__avatarBtn--reply"
        disabled={!canOpenAuthor}
        onClick={goAuthor}
        aria-label={
          canOpenAuthor ? `Профіль ${authorHandle}` : "Автор відповіді"
        }
      >
        <img
          className="postCommentsSection__avatar postCommentsSection__avatar--reply"
          src={commentAvatarSrc(reply)}
          alt=""
        />
      </button>
      <div className="postCommentsSection__thread">
        <CommentBubble
          comment={reply}
          currentUserId={currentUserId}
          profileNav={profileNav}
          onDeleteComment={onDeleteComment}
          onEditComment={onEditComment}
        />
      </div>
    </li>
  );
}

/**
 * Секція коментарів (як у Facebook): список зверху, поле вводу знизу в одному блоці.
 */
export default function PostCommentsSection({
  post,
  comments = [],
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onEditComment,
  replyOpenCommentId,
  replyDraft,
  onReplyDraftChange,
  onOpenReplyComposer,
  onSubmitReply,
  onShowMoreReplies,
  variant = "profile",
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const profileNav = useUserProfileNav();
  const list = (Array.isArray(comments) ? comments : []).filter(
    (c) => !c?.isReply && !c?.parentId
  );
  const rootClass =
    variant === "firstPage"
      ? "postCommentsSection postCommentsSection--firstPage"
      : "postCommentsSection";

  return (
    <div className={rootClass} role="region" aria-label="Коментарі до поста">
      <div className="postCommentsSection__toolbar">
        <span className="postCommentsSection__title">Коментарі</span>
        {list.length > 0 && (
          <span className="postCommentsSection__count">{list.length}</span>
        )}
      </div>

      <div className="postCommentsSection__scroll">
        {list.length === 0 ? (
          <p className="postCommentsSection__placeholder">No comments yet</p>
        ) : (
          <ul className="postCommentsSection__list">
            {list.map((c) => {
              const replies = Array.isArray(c.replies) ? c.replies : [];
              const totalReplies = Math.max(
                c.repliesCount ?? 0,
                replies.length
              );
              const expanded = c.repliesExpanded === true;
              let visibleReplies = [];
              let hiddenCount = 0;

              if (!c.repliesLoaded && totalReplies > 0) {
                hiddenCount = totalReplies;
              } else if (expanded) {
                visibleReplies = replies;
                hiddenCount = 0;
              } else {
                visibleReplies = replies.slice(0, VISIBLE_REPLIES_DEFAULT);
                hiddenCount = Math.max(
                  0,
                  totalReplies - visibleReplies.length
                );
              }
              const isReplyOpen =
                replyOpenCommentId != null &&
                String(replyOpenCommentId) === String(c.id);

              return (
                <li key={c.id} className="postCommentsSection__row">
                  <button
                    type="button"
                    className="postCommentsSection__avatarBtn"
                    disabled={
                      !getProfileRouteHandle(c.author) || !profileNav?.openProfile
                    }
                    onClick={() => {
                      const h = getProfileRouteHandle(c.author);
                      if (h && profileNav?.openProfile) {
                        profileNav.openProfile(c.author);
                      }
                    }}
                    aria-label="Автор коментаря"
                  >
                    <img
                      className="postCommentsSection__avatar"
                      src={commentAvatarSrc(c)}
                      alt=""
                    />
                  </button>
                  <div className="postCommentsSection__thread">
                    <CommentBubble
                      comment={c}
                      currentUserId={currentUserId}
                      profileNav={profileNav}
                      onDeleteComment={onDeleteComment}
                      onEditComment={onEditComment}
                      showReplyAction
                      repliesCount={totalReplies}
                      onReplyClick={() => onOpenReplyComposer?.(post, c.id)}
                    />

                    {visibleReplies.length > 0 && (
                      <ul className="postCommentsSection__replies">
                        {visibleReplies.map((r) => (
                          <ReplyRow
                            key={r.id}
                            reply={{ ...r, isReply: true, parentId: c.id }}
                            currentUserId={currentUserId}
                            profileNav={profileNav}
                            onDeleteComment={onDeleteComment}
                            onEditComment={onEditComment}
                          />
                        ))}
                      </ul>
                    )}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        className="postCommentsSection__showMoreReplies"
                        onClick={() => onShowMoreReplies?.(post, c.id)}
                      >
                        Показати ще ({hiddenCount})
                      </button>
                    )}

                    {isReplyOpen && (
                      <div className="postCommentsSection__replyComposer">
                        <CommentComposer
                          compact
                          value={replyDraft}
                          onChange={onReplyDraftChange}
                          onSubmit={() => onSubmitReply?.(post, c.id, replyDraft)}
                          placeholder="Написати відповідь…"
                          ariaLabel="Текст відповіді"
                          sendAriaLabel="Надіслати відповідь"
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="postCommentsSection__composer">
        <CommentComposer
          value={commentDraft}
          onChange={onCommentDraftChange}
          onSubmit={onSubmitComment}
          placeholder="Написати коментар…"
          ariaLabel="Текст нового коментаря"
          sendAriaLabel="Надіслати коментар"
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import profileIcons from '../../constants/profileIcons';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useUserProfileNav } from '../../context/UserProfileNavContext';
import { getProfileRouteHandle } from '../../utils/profileFriendNav';
import { formatRelativeTime } from '../../utils/formatPostTime';
import { i18n } from '../../i18n';
import CommentComposer from './CommentComposer';
import CommentActionMenu from './CommentActionMenu';
import CommentLikeButton from './CommentLikeButton';
import './PostCommentsSection.scss';
import './CommentActionMenu.scss';
import './CommentLikeButton.scss';

const VISIBLE_REPLIES_DEFAULT = 2;

function commentDisplayName(c, t = i18n.t.bind(i18n)) {
  const a = c?.author;
  if (!a) return t('common.user');
  const full = [a.firstName, a.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (a.username) return a.username;
  return t('common.user');
}

function commentAvatarSrc(c) {
  return c?.author?.avatarUrl || profileIcons.userStory;
}

function canManageComment(comment, currentUserId) {
  return Boolean(
    currentUserId &&
      comment?.id &&
      String(comment?.author?.id ?? '') === String(currentUserId)
  );
}

function CommentBubble({
  comment,
  currentUserId,
  profileNav,
  onDeleteComment,
  onEditComment,
  onLikeComment,
  likingCommentId = null,
  showReplyAction = false,
  repliesCount = 0,
  onReplyClick,
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.content ?? '');

  const authorHandle = comment?.author
    ? getProfileRouteHandle(comment.author)
    : null;
  const canOpenAuthor = Boolean(authorHandle && profileNav?.openProfile);
  const goAuthor = () => {
    if (canOpenAuthor) profileNav.openProfile(comment.author);
  };
  const canManage = canManageComment(comment, currentUserId);

  const startEdit = () => {
    setEditDraft(comment.content ?? '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditDraft(comment.content ?? '');
    setIsEditing(false);
  };

  const handleToggleCommentLike = (commentId) => {
    onLikeComment?.(commentId);
  };

  const saveEdit = () => {
    const text = (editDraft ?? '').trim();
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
              {commentDisplayName(comment, t)}
            </button>
            <span
              className="postCommentsSection__when"
              title={
                comment.createdAt
                  ? new Date(comment.createdAt).toLocaleString()
                  : ''
              }
            >
              {formatRelativeTime(comment.createdAt, t)}
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
              placeholder={t('comments.editPlaceholder')}
              ariaLabel={t('comments.editAria')}
              sendAriaLabel={t('comments.saveEditAria')}
            />
            <button
              type="button"
              className="postCommentsSection__editCancel"
              onClick={cancelEdit}
            >
              {t('comments.cancelEdit')}
            </button>
          </div>
        ) : (
          <p className="postCommentsSection__text">{comment.content}</p>
        )}
      </div>
      {!isEditing && (
        <div className="postCommentsSection__commentActions">
          <div className="postCommentsSection__actionsLeft">
            {showReplyAction && (
              <button
                type="button"
                className="postCommentsSection__replyBtn"
                onClick={onReplyClick}
              >
                {t('comments.reply')}
              </button>
            )}
            {repliesCount > 0 && (
              <span className="postCommentsSection__repliesStat">
                {t('comments.repliesCount', { count: repliesCount })}
              </span>
            )}
          </div>
          <CommentLikeButton
            comment={comment}
            onToggle={handleToggleCommentLike}
            onMissingId={() => toast.error(t('posts.toast.commentIdMissing'))}
            busy={
              likingCommentId != null &&
              String(likingCommentId) === String(comment.id)
            }
          />
        </div>
      )}
    </>
  );
}

function ReplyRow({
  reply,
  post,
  currentUserId,
  profileNav,
  onDeleteComment,
  onEditComment,
  onLikeComment,
  likingCommentId,
}) {
  const { t } = useTranslation();
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
          canOpenAuthor
            ? t('comments.authorProfile', { handle: authorHandle })
            : t('comments.replyAuthorAria')
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
          onLikeComment={onLikeComment}
          likingCommentId={likingCommentId}
        />
      </div>
    </li>
  );
}

export default function PostCommentsSection({
  post,
  comments = [],
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onEditComment,
  onLikeComment,
  likingCommentId = null,
  replyOpenCommentId,
  replyDraft,
  onReplyDraftChange,
  onOpenReplyComposer,
  onSubmitReply,
  onShowMoreReplies,
  variant = 'profile',
}) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const profileNav = useUserProfileNav();
  const list = (Array.isArray(comments) ? comments : []).filter(
    (c) => !c?.isReply && !c?.parentId
  );
  const rootClass =
    variant === 'firstPage'
      ? 'postCommentsSection postCommentsSection--firstPage'
      : 'postCommentsSection';

  return (
    <div className={rootClass} role="region" aria-label={t('comments.regionAria')}>
      <div className="postCommentsSection__toolbar">
        <span className="postCommentsSection__title">{t('comments.title')}</span>
        {list.length > 0 && (
          <span className="postCommentsSection__count">{list.length}</span>
        )}
      </div>

      <div className="postCommentsSection__scroll">
        {list.length === 0 ? (
          <p className="postCommentsSection__placeholder">{t('comments.empty')}</p>
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
                    aria-label={t('comments.authorAria')}
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
                      onLikeComment={onLikeComment}
                      likingCommentId={likingCommentId}
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
                            post={post}
                            currentUserId={currentUserId}
                            profileNav={profileNav}
                            onDeleteComment={onDeleteComment}
                            onEditComment={onEditComment}
                            onLikeComment={onLikeComment}
                            likingCommentId={likingCommentId}
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
                        {t('comments.showMore', { count: hiddenCount })}
                      </button>
                    )}

                    {isReplyOpen && (
                      <div className="postCommentsSection__replyComposer">
                        <CommentComposer
                          compact
                          value={replyDraft}
                          onChange={onReplyDraftChange}
                          onSubmit={() => onSubmitReply?.(post, c.id, replyDraft)}
                          placeholder={t('comments.replyPlaceholder')}
                          ariaLabel={t('comments.replyComposeAria')}
                          sendAriaLabel={t('comments.replySendAria')}
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
          placeholder={t('comments.placeholder')}
          ariaLabel={t('comments.composeAria')}
          sendAriaLabel={t('comments.sendAria')}
        />
      </div>
    </div>
  );
}

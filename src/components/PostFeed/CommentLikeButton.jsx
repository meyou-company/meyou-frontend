import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import { getCommentBackendId } from '../../utils/mapApiPostToFeedItem';
import './CommentLikeButton.scss';

export default function CommentLikeButton({
  comment,
  onToggle,
  onMissingId,
  busy = false,
  className = '',
}) {
  const { t } = useTranslation();
  const liked = comment?.isLiked === true;
  const count = Number(comment?.likesCount) || 0;
  const commentId = getCommentBackendId(comment);

  const handleClick = () => {
    if (!commentId) {
      onMissingId?.();
      return;
    }
    onToggle?.(commentId);
  };

  return (
    <button
      type="button"
      className={[
        'commentLikeBtn',
        liked ? 'commentLikeBtn--active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={liked ? t('comments.unlike') : t('comments.like')}
      aria-pressed={liked}
      disabled={busy}
      onClick={handleClick}
    >
      <img
        src={profileIcons.like}
        alt=""
        className="commentLikeBtn__icon"
        aria-hidden="true"
      />
      <span className="commentLikeBtn__count">{count}</span>
    </button>
  );
}

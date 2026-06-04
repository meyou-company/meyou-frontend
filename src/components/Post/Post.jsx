import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { postsApi } from '../../services/postsApi';
import profileIcons from '../../constants/profileIcons';
import {
  getCommentBackendId,
  mapApiPostToFeedItem,
  organizeComments,
} from '../../utils/mapApiPostToFeedItem';
import { findCommentInTree, updateCommentInTree } from '../../utils/commentTree';
import { getPostMediaItems } from '../../utils/postMedia';
import CommentLikeButton from '../PostFeed/CommentLikeButton';
import {
  applyCommentLikeToggle,
  mergeCommentLikeResponse,
} from '../../utils/mergeCommentLikeResponse';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatPostTime } from '../../utils/formatPostTime';
import '../PostFeed/CommentLikeButton.scss';

import './Post.scss';

export default function Post({ onGoBack, onGoProfile }) {
  const { postId } = useParams();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const focus = query.get('focus');

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const commentsRef = useRef(null);

  useEffect(() => {
    if (!postId) return;

    (async () => {
      try {
        const data = await postsApi.getById(postId);
        setPost(mapApiPostToFeedItem(data));
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  useLayoutEffect(() => {
    if (focus === 'comments' && commentsRef.current) {
      commentsRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    }
  }, [focus]);

  if (loading) return <p>Loading...</p>;
  if (!post) return <p>Post not found</p>;

  return (
    <div className="post-page">
      <Header onBack={onGoBack} onClick={onGoProfile} post={post} />

      <PostCard post={post} />

      <div ref={commentsRef}>
        <Comments postId={post.id} autoOpen={focus === 'comments'} />
      </div>
    </div>
  );
}

const Header = ({ onBack, onClick, post }) => {
  return (
    <header className="post-page__topbar">
      <button className="post-page__back post-page__back--mobile" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftFilledBlack} alt="Back" />
      </button>

      <button className="post-page__back post-page__back--tablet" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftBlack} alt="Back" />
      </button>

      <h1 className="post-page__title">Post</h1>

      <button className="post-page__account" onClick={onClick}>
        <img src={post.author.avatarUrl} alt="Account" />
      </button>
    </header>
  );
};

function PostCard({ post }) {
  return (
    <div className="post">
      <div className="post__header">
        <div className="p_1">
          <img className="post__avatar" src={post.author.avatarUrl} alt="" />
          <span className="post__name">
            {post.author.firstName} {post.author.lastName}
          </span>
        </div>
        <div className="p_2">
          <span className="post__loation">{post.location}</span>
        </div>
      </div>

      <p className="post__text">{post.text || post.fullText || post.shortText}</p>

      {(() => {
        const media = getPostMediaItems(post);
        if (media.length === 0) return null;
        return <img className="post__image" src={media[0].url} alt="" />;
      })()}

      <div className="post__meta">
        ❤️ {post.counts?.likes ?? post.likesCount ?? 0} · 💬{' '}
        {post.counts?.comments ?? post.commentsCount ?? 0}
      </div>
    </div>
  );
};

function Comments({ postId, autoOpen }) {
  const [open, setOpen] = useState(autoOpen);

  if (!open) {
    return (
      <button type="button" className="comments__openBtn" onClick={() => setOpen(true)}>
        Показати коментарі
      </button>
    );
  }

  return <CommentsList postId={postId} />;
}

function CommentCard({ comment, onToggleLike, onMissingId, likingId }) {
  const author = comment.author;
  const name = author
    ? [author.firstName, author.lastName].filter(Boolean).join(' ').trim() ||
      author.username ||
      'User'
    : 'User';
  const avatar =
    author?.avatarUrl || profileIcons.userStory;
  const timeLabel = formatPostTime(comment.createdAt);

  return (
    <div className="comments__item">
      <img className="comments__avatar" src={avatar} alt="" />

      <div className="comments__body">
        <div className="comments__head">
          <div className="comments__headMain">
            <span className="comments__name">{name}</span>
            {timeLabel ? (
              <time
                className="comments__time"
                dateTime={comment.createdAt || undefined}
                title={
                  comment.createdAt
                    ? new Date(comment.createdAt).toLocaleString()
                    : ''
                }
              >
                {timeLabel}
              </time>
            ) : null}
          </div>
        </div>

        <p className="comments__text">{comment.content}</p>

        <div className="comments__actions">
          <button type="button" className="comments__replyBtn">
            Відповісти
          </button>
          <CommentLikeButton
            comment={comment}
            onToggle={onToggleLike}
            onMissingId={onMissingId}
            busy={likingId != null && String(likingId) === String(comment.id)}
          />
        </div>
      </div>
    </div>
  );
}

function CommentsList({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState(null);

  useEffect(() => {
    if (!postId) return;

    const fetchComments = async () => {
      try {
        const list = await postsApi.listComments(postId);
        setComments(organizeComments(Array.isArray(list) ? list : []));
      } catch (e) {
        toast.error(getApiErrorMessage(e) || 'Не вдалося завантажити коментарі');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleToggleCommentLike = useCallback(async (commentId) => {
    if (!commentId || likingId) return;

    const comment = findCommentInTree(comments, commentId);

    const id = getCommentBackendId(comment);
    if (!id) {
      toast.error('Comment id is missing');
      return;
    }
    if (!comment) return;

    const snapshot = {
      ...comment,
      viewerState: { ...comment.viewerState },
    };

    setLikingId(id);
    setComments((prev) => updateCommentInTree(prev, id, applyCommentLikeToggle));

    try {
      const res = await postsApi.likeComment(id);
      setComments((prev) =>
        updateCommentInTree(prev, id, (c) => mergeCommentLikeResponse(c, res))
      );
    } catch (e) {
      setComments((prev) => updateCommentInTree(prev, id, () => snapshot));
      toast.error(getApiErrorMessage(e) || 'Не вдалося поставити лайк');
    } finally {
      setLikingId(null);
    }
  }, [comments, likingId]);

  if (loading) return <p className="comments__loading">Loading comments...</p>;

  if (!comments.length) {
    return <p className="comments__empty">No comments yet</p>;
  }

  return (
    <div className="comments">
      {comments.map((c) => (
        <CommentCard
          key={c.id}
          comment={c}
          onToggleLike={handleToggleCommentLike}
          onMissingId={() => toast.error('Comment id is missing')}
          likingId={likingId}
        />
      ))}
    </div>
  );
}

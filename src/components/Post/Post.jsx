import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { postsApi } from '../../services/postsApi';
import profileIcons from '../../constants/profileIcons';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';
import { getPostMediaItems } from '../../utils/postMedia';

import './Post.scss';
import { formatTime } from '../../utils/utils';

export default function Post({ onGoBack, onGoProfile }) {
  const { postId } = useParams();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const focus = query.get('focus');
  const commentId = query.get('comment');
  const parentCommentId = query.get('parentComment');

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const commentsRef = useRef(null);

  // 🔥 1. load post
  useEffect(() => {
    if (!postId) return;

    (async () => {
      try {
        const data = await postsApi.getById(postId);
        setPost(mapApiPostToFeedItem(data));
        console.log('RAW POST:', data);
        console.log('MAPPED POST:', mapApiPostToFeedItem(data));
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  // 🔥 2. scroll to comments WITHOUT animation
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
      <Header onBack={onGoBack} />
      <div className="divider-top" />
      <PostCard post={post} onClick={onGoProfile} />
      <div className="divider-bottom" />

      <div ref={commentsRef}>
        <Comments
          postId={post.id}
          autoOpen={focus === 'comments'}
          commentId={commentId}
          parentCommentId={parentCommentId}
        />
      </div>
    </div>
  );
}

const Header = ({ onBack }) => {
  return (
    <header className="post-page__topbar">
      {/* Кнопка для мобілки */}
      <button className="post-page__back post-page__back--mobile" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftFilledBlack} alt="Back" />
      </button>

      {/* Кнопка для планшету і вище */}
      <button className="post-page__back post-page__back--tablet" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftBlack} alt="Back" />
      </button>

      <h1 className="post-page__title">Post</h1>
    </header>
  );
};

function PostCard({ post, onClick }) {
  return (
    <div className="post">
      {/* автор */}
      <div className="post__header">
        <div className="p_1" onClick={() => onClick(post.author.username)}>
          <img className="post__avatar" src={post.author.avatarUrl} alt="Account" />
          <span className="post__name">
            {post.author.firstName} {post.author.lastName}
          </span>
        </div>
        <div>
          <span className="post__location">{post.location}</span>
        </div>
      </div>

      {/* текст */}
      <p className="post__text">{post.text}</p>

      {/* картинка */}
      {(() => {
        const media = getPostMediaItems(post);
        if (media.length === 0) return null;
        return <img className="post__image" src={media[0].url} alt="" />;
      })()}

      {/* лайки */}
      <div className="post__meta">
        ❤️ {post.counts?.likes ?? 0} 💬 {post.counts?.comments ?? 0}
        <span className="post__location">{formatTime(post.createdAt)}</span>
      </div>
    </div>
  );
}

function Comments({ postId, autoOpen, commentId, parentCommentId }) {
  const [open, setOpen] = useState(autoOpen);

  if (!open) {
    return <button onClick={() => setOpen(true)}>Показать коментарии</button>;
  }

  return <CommentsList postId={postId} commentId={commentId} parentCommentId={parentCommentId} />;
}

function CommentsList({ postId, commentId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [expanded, setExpanded] = useState({});
  const [repliesCache, setRepliesCache] = useState({});

  const LIMIT = 5;

  useEffect(() => {
    loadComments(1, true);
  }, [postId]);

  const loadComments = async (pageToLoad, replace = false) => {
    try {
      setLoading(true);

      const res = await postsApi.listComments(postId, {
        page: pageToLoad,
        limit: LIMIT,
      });

      const data = Array.isArray(res) ? res : res.data || [];

      setComments((prev) => {
        return replace ? data : [...prev, ...data];
      });

      setHasMore(data.length === LIMIT);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  };

  // lazy replies
  const loadReplies = async (commentId) => {
    if (repliesCache[commentId]) {
      setExpanded((p) => ({
        ...p,
        [commentId]: !p[commentId],
      }));
      return;
    }

    const res = await postsApi.listReplies(commentId);
    const replies = Array.isArray(res) ? res : res.data || [];

    setRepliesCache((prev) => ({
      ...prev,
      [commentId]: replies,
    }));

    setExpanded((p) => ({
      ...p,
      [commentId]: true,
    }));
  };

  if (loading && comments.length === 0) {
    return <p>Loading comments...</p>;
  }

  return (
    <div className="comments">
      {comments.map((c) => (
        <CommentThread
          key={c.id}
          comment={c}
          replies={repliesCache[c.id] || []}
          expanded={expanded[c.id]}
          onToggleReplies={() => loadReplies(c.id)}
          highlightId={commentId}
        />
      ))}

      {/* 🔥 LOAD MORE */}
      {hasMore && (
        <button className="comments__load-more" onClick={() => loadComments(page + 1)}>
          Больше коментариев
        </button>
      )}

      {!hasMore && comments.length === 0 && (
        <div className="notifications__empty">У вас пока нет комментариев</div>
      )}
    </div>
  );
}

function CommentThread({ comment, replies, expanded, onToggleReplies, highlightId }) {
  return (
    <div className="comment-thread">
      {/* MAIN COMMENT */}
      <div
        id={`comment-${comment.id}`}
        className={`comment ${highlightId === comment.id ? 'is-highlighted' : ''}`}
      >
        <img src={comment.user?.avatarUrl} className="comment__avatar" />

        <div className="comment__content">
          <div className="comment__header">
            <span className="comment__name">
              {comment.user?.firstName} {comment.user?.lastName}
            </span>

            <span className="comment__time">{formatTime(comment.createdAt)}</span>
          </div>

          <div className="comment__text">"{comment.content}"</div>

          {comment.repliesCount > 0 && (
            <button className="comment__replies-btn" onClick={onToggleReplies}>
              {expanded ? 'Hide replies' : `View replies (${comment.repliesCount})`}
            </button>
          )}
        </div>
      </div>

      {/* REPLIES */}
      {expanded && (
        <div className="comment-replies">
          {replies.map((r) => (
            <div key={r.id} className="comment comment--reply">
              <img src={r.user?.avatarUrl} className="comment__avatar" />

              <div className="comment__content">
                <div className="comment__header">
                  <span className="comment__name">
                    {r.user?.firstName} {r.user?.lastName}
                  </span>
                  <span className="comment__time">{formatTime(comment.createdAt)}</span>
                </div>

                <div className="comment__text">"{r.content}"</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

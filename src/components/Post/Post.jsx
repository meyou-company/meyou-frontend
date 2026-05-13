import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { postsApi } from '../../services/postsApi';
import profileIcons from '../../constants/profileIcons';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';

import './Post.scss';

export default function Post({ onGoBack, onGoProfile }) {
  const { postId } = useParams();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const focus = query.get('focus');

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
      {/* Кнопка для мобілки */}
      <button className="post-page__back post-page__back--mobile" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftFilledBlack} alt="Back" />
      </button>

      {/* Кнопка для планшету і вище */}
      <button className="post-page__back post-page__back--tablet" onClick={onBack}>
        <img className="post-page__back-icon" src={profileIcons.arrowLeftBlack} alt="Back" />
      </button>

      <h1 className="post-page__title">Post</h1>

      {/* 🔥 ІКОКА АКАУНТА */}
      <button className="post-page__account" onClick={onClick}>
        <img src={post.author.avatarUrl} alt="Account" />
      </button>
    </header>
  );
};

function PostCard({ post }) {
  return (
    <div className="post">
      {/* автор */}
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

      {/* текст */}
      <p className="post__text">{post.fullText || post.shortText}</p>

      {/* картинка */}
      {post.media?.length > 0 && <img className="post__image" src={post.media[0].url} alt="" />}

      {/* лайки */}
      <div className="post__meta">
        ❤️ {post.likesCount} · 💬 {post.commentsCount}
      </div>
    </div>
  );
}

function Comments({ postId, autoOpen }) {
  const [open, setOpen] = useState(autoOpen);

  if (!open) {
    return <button onClick={() => setOpen(true)}>Показати коментарі</button>;
  }

  return <CommentsList postId={postId} />;
}

function CommentsList({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const fetchComments = async () => {
      try {
        const res = await postsApi.listComments(postId);
        setComments(res.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  if (loading) return <p className="comments__loading">Loading comments...</p>;

  if (!comments.length) {
    return <p className="comments__empty">No comments yet</p>;
  }

  return (
    <div className="comments">
      {comments.map((c) => (
        <div key={c.id} className="comments__item">
          <img className="comments__avatar" src={c.user?.avatarUrl} alt="" />

          <div className="comments__body">
            <div className="comments__header">
              <span className="comments__name">
                {c.user?.firstName} {c.user?.lastName}
              </span>
            </div>

            <p className="comments__text">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

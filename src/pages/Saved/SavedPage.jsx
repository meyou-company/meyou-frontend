import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader from '../../components/Layout/AppHeader';
import MessagesNavBadge from '../../components/Messages/MessagesNavBadge';
import VideoCardThumbnail from '../../components/Video/VideoCardThumbnail';
import VideoPlayerModal from '../../components/Video/VideoPlayerModal';
import profileIcons from '../../constants/profileIcons';
import { useNavItems } from '../../hooks/useNavItems';
import { postsApi } from '../../services/postsApi';
import { videosApi } from '../../services/videosApi';
import { useAuthStore } from '../../zustand/useAuthStore';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';
import { formatVideoCount, mapApiVideosToCards } from '../../utils/mapApiVideoToCard';
import './SavedPage.scss';

const TABS = [
  { id: 'all', label: 'Все' },
  { id: 'posts', label: 'Публикации' },
  { id: 'videos', label: 'Видео' },
  { id: 'reels', label: 'Рилсы' },
  { id: 'photos', label: 'Фото' },
];

const getPostAuthorName = (post) => {
  const author = post.author;
  return `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || author?.username || 'Пользователь';
};

const getPostDate = (post) => post.savedAt || post.createdAt || '';

function DesktopNavigation() {
  const navigate = useNavigate();
  const navItems = useNavItems();

  return (
    <nav className="savedPage__desktopNav" aria-label="Основная навигация">
      {navItems.map((item) => (
        <button key={item.key} type="button" className="savedPage__desktopNavItem" onClick={() => navigate(item.path)}>
          <span className="savedPage__desktopNavIconWrap">
            <img src={profileIcons[item.icon]} alt="" />
            {item.key === 'messages' && <MessagesNavBadge />}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SavedCard({ item, view, menuOpen, onMenu, onOpen, onRemove, onShare, onProfile }) {
  const isVideo = item.kind === 'video';
  const media = item.media?.[0];
  const isPostVideo = !isVideo && media?.type === 'VIDEO';
  const title = isVideo ? item.title : item.text;
  const authorName = isVideo ? item.name : getPostAuthorName(item);
  const location = item.location || '';
  const likes = isVideo ? item.likes : formatVideoCount(item.counts?.likes);
  const comments = isVideo ? item.comments : formatVideoCount(item.counts?.comments);

  return (
    <article className={`savedCard savedCard--${view}`}>
      <div
        className="savedCard__media"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Открыть ${title || 'материал'}`}
      >
        {isVideo ? (
          <VideoCardThumbnail
            thumbnailUrl={item.thumbnailUrl}
            videoUrl={item.videoUrl}
            alt={title || authorName}
            className="savedCard__image"
          />
        ) : isPostVideo ? (
          <video className="savedCard__image" src={media.url} muted playsInline preload="metadata" />
        ) : media?.url ? (
          <img className="savedCard__image" src={media.url} alt={title || authorName} loading="lazy" />
        ) : (
          <span className="savedCard__placeholder">{(title || authorName).slice(0, 1)}</span>
        )}

        {(isVideo || isPostVideo) && (
          <span className="savedCard__play" aria-hidden="true">
            <img src={profileIcons.playVideo} alt="" />
          </span>
        )}

        <span className="savedCard__overlay">
          <span className="savedCard__identity">
            <button type="button" onClick={onProfile}>{authorName}</button>
            {location && <span><img src={profileIcons.locationVideo} alt="" />{location}</span>}
          </span>
          <span className="savedCard__stats">
            <span><img src={profileIcons.heartVideo} alt="" />{likes}</span>
            <span><img src={profileIcons.commentsVideo} alt="" />{comments}</span>
          </span>
        </span>
      </div>

      <div className="savedCard__footer">
        <p>{title || 'Сохранённый материал'}</p>
        <button type="button" className="savedCard__more" onClick={onMenu} aria-label="Действия с материалом" aria-expanded={menuOpen}>
          <span aria-hidden="true">&#8942;</span>
        </button>
      </div>

      {menuOpen && (
        <div className="savedCard__menu" role="menu">
          <button type="button" role="menuitem" onClick={onRemove}>
            <img src={profileIcons.savedPost} alt="" />Убрать из сохранённого
          </button>
          <button type="button" role="menuitem" onClick={onShare}>
            <img src={profileIcons.share} alt="" />Поделиться
          </button>
        </div>
      )}
    </article>
  );
}

export default function SavedPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthed = useAuthStore((state) => state.isAuthed);
  const [posts, setPosts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllTop, setShowAllTop] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const menuRootRef = useRef(null);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError('');
    const [postsResult, videosResult] = await Promise.allSettled([
      postsApi.listSaved({ page: 1, limit: 100 }),
      videosApi.list({ page: 1, limit: 100, tab: 'saved', sort: 'recent' }),
    ]);

    const nextPosts = postsResult.status === 'fulfilled'
      ? postsResult.value.map(mapApiPostToFeedItem).filter(Boolean).map((post) => ({ ...post, kind: 'post' }))
      : [];
    const nextVideos = videosResult.status === 'fulfilled'
      ? mapApiVideosToCards(videosResult.value.items).map((video) => ({ ...video, kind: video.raw?.type === 'REEL' ? 'reel' : 'video' }))
      : [];

    setPosts(nextPosts);
    setVideos(nextVideos);
    if (postsResult.status === 'rejected' && videosResult.status === 'rejected') {
      setError('Не удалось загрузить сохранённые материалы. Попробуйте ещё раз.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRootRef.current?.contains(event.target)) setMenuId(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  const allItems = useMemo(() => [...posts, ...videos].sort((a, b) => {
    const aDate = Date.parse(a.kind === 'post' ? getPostDate(a) : a.raw?.savedAt || a.raw?.createdAt || 0) || 0;
    const bDate = Date.parse(b.kind === 'post' ? getPostDate(b) : b.raw?.savedAt || b.raw?.createdAt || 0) || 0;
    return bDate - aDate;
  }), [posts, videos]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    if (activeTab === 'posts') return posts;
    if (activeTab === 'videos') return videos.filter((item) => item.kind === 'video');
    if (activeTab === 'reels') return videos.filter((item) => item.kind === 'reel');
    return posts.filter((post) => post.media?.some((media) => media.type === 'IMAGE'));
  }, [activeTab, allItems, posts, videos]);

  const featured = showAllTop ? filteredItems : filteredItems.slice(0, 4);

  const removeSaved = async (item) => {
    setMenuId(null);
    if (item.kind === 'post') setPosts((current) => current.filter((post) => post.id !== item.id));
    else setVideos((current) => current.filter((video) => video.id !== item.id));
    try {
      if (item.kind === 'post') await postsApi.unsave(item.id);
      else await videosApi.unsave(item.id);
      toast.success('Удалено из сохранённого');
    } catch {
      toast.error('Не удалось удалить из сохранённого');
      loadSaved();
    }
  };

  const shareItem = async (item) => {
    setMenuId(null);
    const url = `${window.location.origin}${item.kind === 'post' ? `/post/${item.id}` : `/video?video=${item.id}`}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title || item.text || 'ME YOU', url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Ссылка скопирована');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') toast.error('Не удалось поделиться');
    }
  };

  const openItem = (item) => {
    setMenuId(null);
    if (item.kind === 'post') navigate(`/post/${item.id}`);
    else setSelectedVideo(item);
  };

  const openProfile = (event, item) => {
    event.stopPropagation();
    const username = item.kind === 'post' ? item.author?.username : item.raw?.author?.username;
    if (username) navigate(`/profile/${encodeURIComponent(username)}`);
  };

  const renderCards = (items, keyPrefix) => items.map((item) => {
    const itemKey = `${item.kind}-${item.id}`;
    return (
      <SavedCard
        key={`${keyPrefix}-${itemKey}`}
        item={item}
        view={view}
        menuOpen={menuId === `${keyPrefix}-${itemKey}`}
        onMenu={(event) => {
          event.stopPropagation();
          setMenuId((current) => current === `${keyPrefix}-${itemKey}` ? null : `${keyPrefix}-${itemKey}`);
        }}
        onOpen={() => openItem(item)}
        onRemove={() => removeSaved(item)}
        onShare={() => shareItem(item)}
        onProfile={(event) => openProfile(event, item)}
      />
    );
  });

  return (
    <div className="savedPage" ref={menuRootRef}>
      <DesktopNavigation />
      <div className="savedPage__appHeader">
        <AppHeader
          onGoProfile={() => navigate('/profile')}
          onGoExplore={() => navigate('/search')}
          onGoWallet={() => navigate('/wallet')}
          onGoVipChat={() => navigate('/vip-chat')}
          onGoHome={() => navigate('/first-page')}
        />
      </div>

      <main className="savedPage__content">
        <header className="savedPage__titleRow">
          <button type="button" className="savedPage__back" onClick={() => navigate(-1)} aria-label="Назад">
            <img src={profileIcons.arrowLeftFilledBlack} alt="" />
          </button>
          <h1>Сохраненное</h1>
        </header>

        <div className="savedPage__tabs" role="tablist" aria-label="Тип сохранённых материалов">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => { setActiveTab(tab.id); setShowAllTop(false); setMenuId(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="savedPage__status">Загрузка сохранённых материалов...</div>}
        {!loading && error && (
          <div className="savedPage__status savedPage__status--error">
            <p>{error}</p><button type="button" onClick={loadSaved}>Повторить</button>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <>
            <section className={`savedPage__featured ${showAllTop ? 'savedPage__featured--expanded' : ''} savedPage__cards savedPage__cards--${view}`}>
              {renderCards(featured, 'featured')}
            </section>
            {filteredItems.length > 4 && (
              <div className="savedPage__showAllRow">
                <button type="button" onClick={() => setShowAllTop((value) => !value)}>{showAllTop ? 'Свернуть' : 'Смотреть все'}</button>
              </div>
            )}

            <div className="savedPage__sectionHead">
              <button type="button" className="savedPage__sort">Недавно сохраненное <span aria-hidden="true">⌄</span></button>
              <div className="savedPage__viewToggle" aria-label="Вид материалов">
                <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Сетка" aria-pressed={view === 'grid'}>
                  <img src={profileIcons.layoutBlack} alt="" />
                </button>
                <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="Список" aria-pressed={view === 'list'}>
                  <img src={profileIcons.listBlack} alt="" />
                </button>
              </div>
            </div>

            <section className={`savedPage__recent savedPage__cards savedPage__cards--${view}`}>
              {renderCards(filteredItems, 'recent')}
            </section>
          </>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <section className="savedPage__empty">
            <img src={profileIcons.savedPost} alt="" />
            <h2>Здесь пока пусто</h2>
            <p>Сохраняйте посты, видео и другие материалы,<br />чтобы вернуться к ним позже.</p>
            <button type="button" onClick={() => navigate('/first-page')}>Смотреть рекомендации</button>
          </section>
        )}
      </main>

      <VideoPlayerModal
        video={selectedVideo}
        isOpen={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
        isAuthed={isAuthed}
        currentUserId={user?.id}
      />
    </div>
  );
}

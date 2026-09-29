import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LuCheck, LuChevronDown, LuChevronRight, LuFolderPlus, LuPlus, LuX } from 'react-icons/lu';
import AppHeader from '../../components/Layout/AppHeader';
import MessagesNavBadge from '../../components/Messages/MessagesNavBadge';
import DeletePostConfirmDialog from '../../components/PostFeed/DeletePostConfirmDialog';
import VideoCardThumbnail from '../../components/Video/VideoCardThumbnail';
import VideoPlayerModal from '../../components/Video/VideoPlayerModal';
import profileIcons from '../../constants/profileIcons';
import { useNavItems } from '../../hooks/useNavItems';
import { postsApi } from '../../services/postsApi';
import { videosApi } from '../../services/videosApi';
import { useAuthStore } from '../../zustand/useAuthStore';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';
import { formatVideoCount, mapApiVideosToCards } from '../../utils/mapApiVideoToCard';
import { resolveProfileUsername } from '../../utils/profileUsername';
import './SavedPage.scss';

const TABS = [
  { id: 'all', label: 'Все' },
  { id: 'posts', label: 'Публикации' },
  { id: 'videos', label: 'Видео' },
  { id: 'reels', label: 'Рилсы' },
  { id: 'photos', label: 'Фото' },
];

const SAVED_COLLECTIONS_STORAGE_KEY = 'lunmeyo.savedCollections.v1';

const getSavedItemKey = (item) => `${item.kind}:${item.id}`;

const readSavedCollections = () => {
  if (typeof window === 'undefined') return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_COLLECTIONS_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

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

function SavedCard({ item, view, menuOpen, onMenu, onCloseMenu, onOpen, onRemove, onAddToCollection, onShare, onDelete, onProfile }) {
  const isVideo = item.kind !== 'post';
  const media = item.media?.[0];
  const isPostVideo = !isVideo && media?.type === 'VIDEO';
  const title = isVideo ? item.title : item.text;
  const authorName = isVideo ? item.name : getPostAuthorName(item);
  const location = item.location || '';
  const likes = isVideo ? item.likes : formatVideoCount(item.counts?.likes);
  const comments = isVideo ? item.comments : formatVideoCount(item.counts?.comments);
  const menuDomId = `saved-actions-${item.kind}-${item.id}`;

  return (
    <article className={`savedCard savedCard--${view} ${menuOpen ? 'savedCard--menuOpen' : ''}`}>
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
          <button type="button" className="savedCard__author" onClick={onProfile}>{authorName}</button>
          <span className="savedCard__meta">
            {location && <span className="savedCard__location"><img src={profileIcons.locationVideo} alt="" />{location}</span>}
            <span className="savedCard__stats">
              <span><img src={profileIcons.heartVideo} alt="" />{likes}</span>
              <span><img src={profileIcons.commentsVideo} alt="" />{comments}</span>
            </span>
          </span>
        </span>
      </div>

      <div className="savedCard__footer">
        <p>{title || 'Сохранённый материал'}</p>
        <button
          type="button"
          className="savedCard__more"
          onClick={onMenu}
          aria-label="Действия с материалом"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuDomId : undefined}
          aria-haspopup="menu"
        >
          <span aria-hidden="true">&#8942;</span>
        </button>
      </div>

      {menuOpen && (
        <div
          id={menuDomId}
          className="savedCard__menu"
          role="menu"
          aria-label="Действия с сохранённым материалом"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="savedCard__menuClose"
            onClick={onCloseMenu}
            aria-label="Закрыть меню"
          >
            <LuX aria-hidden="true" />
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onRemove} autoFocus>
            <img src={profileIcons.savedRemoveBlack} alt="" />Убрать из сохранённого
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onAddToCollection}>
            <img src={profileIcons.savedAddCollectionBlack} alt="" />
            <span>Добавить в подборку</span>
            <LuChevronRight className="savedCard__menuChevron" aria-hidden="true" />
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onShare}>
            <img src={profileIcons.savedShareBlack} alt="" />Поделиться
          </button>
          <button type="button" className="savedCard__menuAction savedCard__menuAction--delete" role="menuitem" onClick={onDelete}>
            <img src={profileIcons.savedDeleteBlack} alt="" />Удалить
          </button>
        </div>
      )}
    </article>
  );
}

function SavedCollectionModal({ item, collections, onClose, onToggle, onCreate }) {
  const [name, setName] = useState('');
  const itemKey = item ? getSavedItemKey(item) : '';

  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const submitCollection = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName);
    setName('');
  };

  return (
    <div className="savedCollectionModal" role="presentation" onPointerDown={onClose}>
      <section
        className="savedCollectionModal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-collection-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="savedCollectionModal__header">
          <h2 id="saved-collection-title">Добавить в подборку</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <LuX aria-hidden="true" />
          </button>
        </header>

        <div className="savedCollectionModal__list">
          {collections.length === 0 ? (
            <p className="savedCollectionModal__empty">Создайте первую подборку для сохранённых материалов.</p>
          ) : collections.map((collection) => {
            const selected = collection.items?.includes(itemKey);
            return (
              <button
                key={collection.id}
                type="button"
                className={selected ? 'is-selected' : ''}
                aria-pressed={selected}
                onClick={() => onToggle(collection.id)}
              >
                <span className="savedCollectionModal__folder"><LuFolderPlus aria-hidden="true" /></span>
                <span>{collection.name}</span>
                <span className="savedCollectionModal__check" aria-hidden="true">
                  {selected && <LuCheck />}
                </span>
              </button>
            );
          })}
        </div>

        <form className="savedCollectionModal__create" onSubmit={submitCollection}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название новой подборки"
            maxLength={60}
            autoFocus={collections.length === 0}
          />
          <button type="submit" disabled={!name.trim()} aria-label="Создать подборку">
            <LuPlus aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
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
  const [sortOrder, setSortOrder] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllTop, setShowAllTop] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [collectionTarget, setCollectionTarget] = useState(null);
  const [collections, setCollections] = useState(readSavedCollections);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
    } catch {
      // The collection remains available for the current session if storage is unavailable.
    }
  }, [collections]);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError('');
    const [postsResult, videosResult] = await Promise.allSettled([
      postsApi.listSaved({ page: 1, limit: 100 }),
      videosApi.list({ page: 1, limit: 100, tab: 'saved', sort: 'recent' }),
    ]);

    const nextPosts = postsResult.status === 'fulfilled'
      ? postsResult.value.map((raw) => {
        const post = mapApiPostToFeedItem(raw);
        return post && { ...post, savedAt: raw.savedAt, kind: 'post' };
      }).filter(Boolean)
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
      if (
        !event.target.closest?.('.savedCard__menu') &&
        !event.target.closest?.('.savedCard__more')
      ) {
        setMenuId(null);
      }
    };
    const closeMenuWithKeyboard = (event) => {
      if (event.key === 'Escape') setMenuId(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeMenuWithKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeMenuWithKeyboard);
    };
  }, []);

  const allItems = useMemo(() => [...posts, ...videos].sort((a, b) => {
    const aDate = Date.parse(a.kind === 'post' ? getPostDate(a) : a.raw?.savedAt || a.raw?.createdAt || 0) || 0;
    const bDate = Date.parse(b.kind === 'post' ? getPostDate(b) : b.raw?.savedAt || b.raw?.createdAt || 0) || 0;
    return sortOrder === 'recent' ? bDate - aDate : aDate - bDate;
  }), [posts, videos, sortOrder]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    if (activeTab === 'posts') return allItems.filter((item) => item.kind === 'post');
    if (activeTab === 'videos') return allItems.filter((item) => item.kind === 'video');
    if (activeTab === 'reels') return allItems.filter((item) => item.kind === 'reel');
    return allItems.filter((item) => item.kind === 'post' && item.media?.some((media) => media.type === 'IMAGE'));
  }, [activeTab, allItems]);

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
    const username = resolveProfileUsername(
      item.kind === 'post' ? item.author : item.raw?.author,
    );
    const postPath = username
      ? `/profile/${encodeURIComponent(username)}?post=${encodeURIComponent(item.id)}`
      : `/post/${encodeURIComponent(item.id)}`;
    const url = `${window.location.origin}${item.kind === 'post' ? postPath : `/video?video=${encodeURIComponent(item.id)}`}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title || item.text || 'LunMeYo', url });
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
    if (item.kind === 'post') {
      const username = resolveProfileUsername(item.author);
      if (!username) {
        toast.error('Не удалось открыть профиль автора');
        return;
      }

      navigate(
        `/profile/${encodeURIComponent(username)}?post=${encodeURIComponent(item.id)}`,
      );
      return;
    }

    setSelectedVideo(item);
  };

  const openCollections = (item) => {
    setMenuId(null);
    setCollectionTarget(item);
  };

  const toggleCollectionItem = (collectionId) => {
    if (!collectionTarget) return;
    const itemKey = getSavedItemKey(collectionTarget);
    const selectedCollection = collections.find((collection) => collection.id === collectionId);
    const alreadyAdded = selectedCollection?.items?.includes(itemKey) === true;

    setCollections((current) => current.map((collection) => {
      if (collection.id !== collectionId) return collection;
      const items = Array.isArray(collection.items) ? collection.items : [];
      const itemIsPresent = items.includes(itemKey);
      return {
        ...collection,
        items: itemIsPresent
          ? items.filter((key) => key !== itemKey)
          : [...items, itemKey],
      };
    }));

    toast.success(alreadyAdded ? 'Убрано из подборки' : 'Добавлено в подборку');
  };

  const createCollection = (name) => {
    if (!collectionTarget) return;
    const normalizedName = name.trim();
    const existing = collections.find(
      (collection) => collection.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (existing) {
      const itemKey = getSavedItemKey(collectionTarget);
      if (!existing.items?.includes(itemKey)) toggleCollectionItem(existing.id);
      else toast.info('Материал уже находится в этой подборке');
      return;
    }

    const id = globalThis.crypto?.randomUUID?.() || `collection-${Date.now()}`;
    setCollections((current) => [
      ...current,
      { id, name: normalizedName, items: [getSavedItemKey(collectionTarget)] },
    ]);
    toast.success('Подборка создана');
  };

  const requestDelete = (item) => {
    setMenuId(null);
    const author = item.kind === 'post' ? item.author : item.raw?.author;
    const authorId = author?.id ?? author?._id;
    const currentUserId = user?.id ?? user?._id;
    const authorUsername = resolveProfileUsername(author).toLocaleLowerCase();
    const currentUsername = resolveProfileUsername(user).toLocaleLowerCase();
    const canDelete =
      item.permissions?.canDelete === true ||
      (authorId != null && currentUserId != null && String(authorId) === String(currentUserId)) ||
      (authorUsername && currentUsername && authorUsername === currentUsername);

    if (!canDelete) {
      toast.error('Удалить можно только собственную публикацию');
      return;
    }

    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'post') {
        await postsApi.deletePost(deleteTarget.id);
        setPosts((current) => current.filter((post) => post.id !== deleteTarget.id));
      } else {
        await videosApi.delete(deleteTarget.id);
        setVideos((current) => current.filter((video) => video.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      toast.success('Публикация удалена');
    } catch {
      toast.error('Не удалось удалить публикацию');
    } finally {
      setDeleting(false);
    }
  };

  const openProfile = (event, item) => {
    event.stopPropagation();
    const username = resolveProfileUsername(
      item.kind === 'post' ? item.author : item.raw?.author,
    );
    if (username) navigate(`/profile/${encodeURIComponent(username)}`);
  };

  const renderCards = (items, keyPrefix, cardView = view) => items.map((item) => {
    const itemKey = `${item.kind}-${item.id}`;
    return (
      <SavedCard
        key={`${keyPrefix}-${itemKey}`}
        item={item}
        view={cardView}
        menuOpen={menuId === `${keyPrefix}-${itemKey}`}
        onMenu={(event) => {
          event.stopPropagation();
          setMenuId((current) => current === `${keyPrefix}-${itemKey}` ? null : `${keyPrefix}-${itemKey}`);
        }}
        onCloseMenu={() => setMenuId(null)}
        onOpen={() => openItem(item)}
        onRemove={() => removeSaved(item)}
        onAddToCollection={() => openCollections(item)}
        onShare={() => shareItem(item)}
        onDelete={() => requestDelete(item)}
        onProfile={(event) => openProfile(event, item)}
      />
    );
  });

  return (
    <div className="savedPage">
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
            <span className="savedPage__backIcon" aria-hidden="true" />
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
            <section className={`savedPage__featured ${showAllTop ? 'savedPage__featured--expanded' : ''} savedPage__cards`}>
              {renderCards(featured, 'featured', 'grid')}
            </section>
            {filteredItems.length > 3 && (
              <div className={`savedPage__showAllRow ${filteredItems.length === 4 ? 'savedPage__showAllRow--mobileOnly' : ''}`}>
                <button type="button" onClick={() => setShowAllTop((value) => !value)}>{showAllTop ? 'Свернуть' : 'Смотреть все'}</button>
              </div>
            )}

            <div className="savedPage__sectionHead">
              <label className="savedPage__sort">
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Порядок сохранённых материалов">
                  <option value="recent">Недавно сохраненное</option>
                  <option value="oldest">Сначала старые</option>
                </select>
                <LuChevronDown aria-hidden="true" />
              </label>
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

      <SavedCollectionModal
        item={collectionTarget}
        collections={collections}
        onClose={() => setCollectionTarget(null)}
        onToggle={toggleCollectionItem}
        onCreate={createCollection}
      />

      <DeletePostConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        confirming={deleting}
        title="Удалить публикацию?"
        description="Это действие нельзя отменить."
        confirmLabel={deleting ? 'Удаление...' : 'Удалить'}
        cancelLabel="Отмена"
      />
    </div>
  );
}

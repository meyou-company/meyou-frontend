import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';
import { formatVideoCount, mapApiVideosToCards } from '../../utils/mapApiVideoToCard';
import { resolveProfileUsername } from '../../utils/profileUsername';
import './SavedPage.scss';

const LEGACY_COLLECTIONS_STORAGE_KEY = 'lunmeyo.savedCollections.v1';

const getPostAuthorName = (post, fallback) => {
  const author = post.author;
  return `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || author?.username || fallback;
};

const getPostDate = (post) => post.savedAt || post.createdAt || '';

function DesktopNavigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navItems = useNavItems();

  return (
    <nav className="savedPage__desktopNav" aria-label={t('savedPage.navAria')}>
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

function SavedCard({ item, view, menuOpen, onMenu, onCloseMenu, onOpen, onRemove, onAddToCollection, onShare, onProfile, t }) {
  const isVideo = item.kind !== 'post';
  const media = item.media?.[0];
  const isPostVideo = !isVideo && media?.type === 'VIDEO';
  const title = isVideo ? item.title : item.text;
  const authorName = isVideo ? item.name : getPostAuthorName(item, t('common.user'));
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
        aria-label={t('savedPage.openAria', { title: title || t('savedPage.savedMaterial') })}
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
        <p>{title || t('savedPage.savedMaterial')}</p>
        <button
          type="button"
          className="savedCard__more"
          onClick={onMenu}
          aria-label={t('savedPage.actionsAria')}
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
          aria-label={t('savedPage.actionsAria')}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="savedCard__menuClose"
            onClick={onCloseMenu}
            aria-label={t('savedPage.closeMenu')}
          >
            <LuX aria-hidden="true" />
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onRemove} autoFocus>
            <img src={profileIcons.savedRemoveBlack} alt="" />{t('savedPage.removeFromSaved')}
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onAddToCollection}>
            <img src={profileIcons.savedAddCollectionBlack} alt="" />
            <span>{t('savedPage.addToCollection')}</span>
            <LuChevronRight className="savedCard__menuChevron" aria-hidden="true" />
          </button>
          <button type="button" className="savedCard__menuAction" role="menuitem" onClick={onShare}>
            <img src={profileIcons.savedShareBlack} alt="" />{t('savedPage.share')}
          </button>
        </div>
      )}
    </article>
  );
}

function SavedCollectionModal({ item, collections, loading, error, busyIds, creating, onClose, onToggle, onCreate }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

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
    if (!trimmedName || creating) return;
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
          <h2 id="saved-collection-title">{t('savedPage.modalTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('savedPage.closeMenu')}>
            <LuX aria-hidden="true" />
          </button>
        </header>

        <div className="savedCollectionModal__list">
          {loading ? (
            <p className="savedCollectionModal__empty">{t('savedPage.loadingCollections')}</p>
          ) : error ? (
            <p className="savedCollectionModal__empty">{error}</p>
          ) : collections.length === 0 ? (
            <p className="savedCollectionModal__empty">{t('savedPage.modalEmpty')}</p>
          ) : collections.map((collection) => {
            const selected = collection.containsPost === true;
            const busy = busyIds.includes(collection.id);
            return (
              <button
                key={collection.id}
                type="button"
                className={selected ? 'is-selected' : ''}
                aria-pressed={selected}
                disabled={busy}
                onClick={() => onToggle(collection)}
              >
                <span className="savedCollectionModal__folder"><LuFolderPlus aria-hidden="true" /></span>
                <span className="savedCollectionModal__name">{collection.name}</span>
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
            placeholder={t('savedPage.newNamePlaceholder')}
            maxLength={120}
            disabled={creating}
            autoFocus={!loading && !error && collections.length === 0}
          />
          <button type="submit" disabled={!name.trim() || creating} aria-label={t('savedPage.createAria')}>
            <LuPlus aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}

function mapSavedPost(raw) {
  const post = mapApiPostToFeedItem(raw);
  return post && { ...post, savedAt: raw.savedAt, kind: 'post' };
}

export default function SavedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const isCollectionView = Boolean(collectionId);
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
  const [collections, setCollections] = useState([]);
  const [pickerCollections, setPickerCollections] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [busyCollectionIds, setBusyCollectionIds] = useState([]);
  const busyCollectionIdsRef = useRef(new Set());
  const [creatingCollection, setCreatingCollection] = useState(false);
  const creatingCollectionRef = useRef(false);
  const [collectionMeta, setCollectionMeta] = useState(null);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleteCollectionOpen, setDeleteCollectionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tabs = useMemo(() => ([
    { id: 'all', label: t('savedPage.tabs.all') },
    { id: 'posts', label: t('savedPage.tabs.posts') },
    { id: 'videos', label: t('savedPage.tabs.videos') },
    { id: 'reels', label: t('savedPage.tabs.reels') },
    { id: 'photos', label: t('savedPage.tabs.photos') },
  ]), [t]);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_COLLECTIONS_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const rows = await postsApi.listSavedCollections();
      setCollections(Array.isArray(rows) ? rows : []);
    } catch {
      // Keep the last known chip list; a wipe would look like “no collections”.
    }
  }, []);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!collectionId) setCollectionMeta(null);

    if (collectionId) {
      try {
        const data = await postsApi.getSavedCollection(collectionId);
        const nextPosts = (Array.isArray(data?.items) ? data.items : [])
          .map(mapSavedPost)
          .filter(Boolean);
        setPosts(nextPosts);
        setVideos([]);
        setCollectionMeta({
          id: data.id,
          name: data.name || '',
          itemsCount: data.itemsCount ?? nextPosts.length,
        });
      } catch (loadError) {
        setPosts([]);
        setVideos([]);
        setError(getApiErrorMessage(loadError) || t('savedPage.loadCollectionError'));
      }
      setLoading(false);
      return;
    }

    const [postsResult, videosResult] = await Promise.allSettled([
      postsApi.listSaved({ page: 1, limit: 100 }),
      videosApi.list({ page: 1, limit: 100, tab: 'saved', sort: 'recent' }),
    ]);

    const nextPosts = postsResult.status === 'fulfilled'
      ? postsResult.value.map(mapSavedPost).filter(Boolean)
      : [];
    const nextVideos = videosResult.status === 'fulfilled'
      ? mapApiVideosToCards(videosResult.value.items).map((video) => ({ ...video, kind: video.raw?.type === 'REEL' ? 'reel' : 'video' }))
      : [];

    setPosts(nextPosts);
    setVideos(nextVideos);
    if (postsResult.status === 'rejected' && videosResult.status === 'rejected') {
      setError(t('savedPage.loadError'));
    }
    setLoading(false);
  }, [collectionId, t]);

  useEffect(() => { loadSaved(); }, [loadSaved]);
  useEffect(() => {
    if (!isCollectionView) loadCollections();
  }, [isCollectionView, loadCollections]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (
        !event.target.closest?.('.savedCard__menu') &&
        !event.target.closest?.('.savedCard__more') &&
        !event.target.closest?.('.savedPage__collectionMenu')
      ) {
        setMenuId(null);
        setCollectionMenuOpen(false);
      }
    };
    const closeMenuWithKeyboard = (event) => {
      if (event.key === 'Escape') {
        setMenuId(null);
        setCollectionMenuOpen(false);
      }
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
    if (isCollectionView || activeTab === 'all') return allItems;
    if (activeTab === 'posts') return allItems.filter((item) => item.kind === 'post');
    if (activeTab === 'videos') return allItems.filter((item) => item.kind === 'video');
    if (activeTab === 'reels') return allItems.filter((item) => item.kind === 'reel');
    return allItems.filter((item) => item.kind === 'post' && item.media?.some((media) => media.type === 'IMAGE'));
  }, [activeTab, allItems, isCollectionView]);

  const featured = showAllTop ? filteredItems : filteredItems.slice(0, 4);

  const removeSaved = async (item) => {
    setMenuId(null);
    if (item.kind === 'post') setPosts((current) => current.filter((post) => post.id !== item.id));
    else setVideos((current) => current.filter((video) => video.id !== item.id));
    try {
      if (item.kind === 'post') await postsApi.unsave(item.id);
      else await videosApi.unsave(item.id);
      toast.success(t('savedPage.removedFromSaved'));
      if (collectionTarget?.id === item.id) {
        setCollectionTarget(null);
        setPickerCollections([]);
        setPickerError('');
      }
      loadCollections();
    } catch {
      toast.error(t('savedPage.removeFailed'));
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
        toast.success(t('savedPage.linkCopied'));
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') toast.error(t('savedPage.shareFailed'));
    }
  };

  const openItem = (item) => {
    setMenuId(null);
    if (item.kind === 'post') {
      const username = resolveProfileUsername(item.author);
      if (!username) {
        toast.error(t('savedPage.authorOpenError'));
        return;
      }

      navigate(
        `/profile/${encodeURIComponent(username)}?post=${encodeURIComponent(item.id)}`,
      );
      return;
    }

    setSelectedVideo(item);
  };

  const openCollections = async (item) => {
    setMenuId(null);
    if (item.kind !== 'post') {
      toast.info(t('savedPage.postsOnly'));
      return;
    }
    setCollectionTarget(item);
    setPickerLoading(true);
    setPickerError('');
    try {
      const rows = await postsApi.listSavedCollections({ postId: item.id });
      setPickerCollections(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setPickerCollections([]);
      const message = getApiErrorMessage(loadError) || t('savedPage.loadCollectionsError');
      setPickerError(message);
      toast.error(message);
    } finally {
      setPickerLoading(false);
    }
  };

  const toggleCollectionItem = async (collection) => {
    if (!collectionTarget || collectionTarget.kind !== 'post') return;
    if (busyCollectionIdsRef.current.has(collection.id)) return;
    const alreadyAdded = collection.containsPost === true;
    const nextContains = !alreadyAdded;
    busyCollectionIdsRef.current.add(collection.id);
    setBusyCollectionIds([...busyCollectionIdsRef.current]);
    setPickerCollections((current) => current.map((row) => (
      row.id === collection.id
        ? {
            ...row,
            containsPost: nextContains,
            itemsCount: Math.max(0, (row.itemsCount || 0) + (nextContains ? 1 : -1)),
          }
        : row
    )));
    try {
      if (alreadyAdded) {
        await postsApi.removePostFromSavedCollection(collection.id, collectionTarget.id);
        toast.success(t('savedPage.removedFromCollection'));
        if (collectionId === collection.id) {
          setPosts((current) => current.filter((post) => post.id !== collectionTarget.id));
        }
      } else {
        await postsApi.addPostToSavedCollection(collection.id, collectionTarget.id);
        toast.success(t('savedPage.addedToCollection'));
      }
      loadCollections();
    } catch (toggleError) {
      const status = toggleError?.response?.status;
      if (!alreadyAdded && status === 409) {
        toast.info(t('savedPage.alreadyInCollection'));
        loadCollections();
        return;
      }
      if (alreadyAdded && status === 404) {
        loadCollections();
        return;
      }
      setPickerCollections((current) => current.map((row) => (
        row.id === collection.id
          ? { ...row, containsPost: alreadyAdded, itemsCount: collection.itemsCount }
          : row
      )));
      toast.error(getApiErrorMessage(toggleError) || t('savedPage.toggleFailed'));
    } finally {
      busyCollectionIdsRef.current.delete(collection.id);
      setBusyCollectionIds([...busyCollectionIdsRef.current]);
    }
  };

  const createCollection = async (name) => {
    if (!collectionTarget || collectionTarget.kind !== 'post') return;
    if (creatingCollectionRef.current) return;
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const existing = pickerCollections.find(
      (collection) => collection.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );
    if (existing) {
      if (!existing.containsPost) await toggleCollectionItem(existing);
      else toast.info(t('savedPage.alreadyInCollection'));
      return;
    }

    creatingCollectionRef.current = true;
    setCreatingCollection(true);
    let created = null;
    try {
      created = await postsApi.createSavedCollection(normalizedName);
    } catch (createError) {
      toast.error(getApiErrorMessage(createError) || t('savedPage.createFailed'));
      creatingCollectionRef.current = false;
      setCreatingCollection(false);
      return;
    }

    try {
      await postsApi.addPostToSavedCollection(created.id, collectionTarget.id);
      setPickerCollections((current) => [
        { ...created, containsPost: true, itemsCount: 1 },
        ...current.filter((row) => row.id !== created.id),
      ]);
      toast.success(t('savedPage.createSuccess'));
    } catch (addError) {
      setPickerCollections((current) => [
        { ...created, containsPost: false, itemsCount: 0 },
        ...current.filter((row) => row.id !== created.id),
      ]);
      toast.error(getApiErrorMessage(addError) || t('savedPage.createAddFailed'));
    } finally {
      loadCollections();
      creatingCollectionRef.current = false;
      setCreatingCollection(false);
    }
  };

  const confirmRename = async (event) => {
    event.preventDefault();
    if (!collectionMeta?.id || renaming) return;
    const nextName = renameValue.trim();
    if (!nextName) return;
    setRenaming(true);
    try {
      const updated = await postsApi.renameSavedCollection(collectionMeta.id, nextName);
      setCollectionMeta((current) => current && { ...current, name: updated.name || nextName });
      setRenameOpen(false);
      toast.success(t('savedPage.renamed'));
      loadCollections();
    } catch (renameError) {
      toast.error(getApiErrorMessage(renameError) || t('savedPage.renameFailed'));
    } finally {
      setRenaming(false);
    }
  };

  const confirmDeleteCollection = async () => {
    if (!collectionMeta?.id || deleting) return;
    setDeleting(true);
    try {
      await postsApi.deleteSavedCollection(collectionMeta.id);
      setDeleteCollectionOpen(false);
      toast.success(t('savedPage.deletedCollection'));
      navigate('/saved', { replace: true });
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError) || t('savedPage.deleteCollectionFailed'));
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
        t={t}
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
        onProfile={(event) => openProfile(event, item)}
      />
    );
  });

  const pageTitle = isCollectionView
    ? (collectionMeta?.name || t('savedPage.collectionFallback'))
    : t('savedPage.title');

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
          <button
            type="button"
            className="savedPage__back"
            onClick={() => (isCollectionView ? navigate('/saved') : navigate(-1))}
            aria-label={isCollectionView ? t('savedPage.backToSaved') : t('common.back')}
          >
            <span className="savedPage__backIcon" aria-hidden="true" />
          </button>
          <h1>{pageTitle}</h1>
          {isCollectionView && collectionMeta ? (
            <div className="savedPage__collectionMenu">
              <button
                type="button"
                className="savedCard__more"
                onClick={(event) => {
                  event.stopPropagation();
                  setCollectionMenuOpen((open) => !open);
                }}
                aria-label={t('savedPage.collectionMenuAria')}
                aria-expanded={collectionMenuOpen}
              >
                <span aria-hidden="true">&#8942;</span>
              </button>
              {collectionMenuOpen ? (
                <div className="savedCard__menu savedPage__collectionActions" role="menu">
                  <button
                    type="button"
                    className="savedCard__menuAction"
                    role="menuitem"
                    onClick={() => {
                      setCollectionMenuOpen(false);
                      setRenameValue(collectionMeta.name || '');
                      setRenameOpen(true);
                    }}
                  >
                    {t('savedPage.rename')}
                  </button>
                  <button
                    type="button"
                    className="savedCard__menuAction savedCard__menuAction--delete"
                    role="menuitem"
                    onClick={() => {
                      setCollectionMenuOpen(false);
                      setDeleteCollectionOpen(true);
                    }}
                  >
                    {t('savedPage.deleteCollection')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        {!isCollectionView && collections.length > 0 ? (
          <div className="savedPage__collections" aria-label={t('savedPage.collectionsAria')}>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className="savedPage__collectionChip"
                onClick={() => navigate(`/saved/collections/${encodeURIComponent(collection.id)}`)}
              >
                <LuFolderPlus aria-hidden="true" />
                <span>{collection.name}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!isCollectionView ? (
          <div className="savedPage__tabs" role="tablist" aria-label={t('savedPage.tabsAria')}>
            {tabs.map((tab) => (
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
        ) : null}

        {loading && <div className="savedPage__status">{isCollectionView ? t('savedPage.loadingCollection') : t('savedPage.loading')}</div>}
        {!loading && error && (
          <div className="savedPage__status savedPage__status--error">
            <p>{error}</p><button type="button" onClick={loadSaved}>{t('common.retry')}</button>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <>
            {!isCollectionView ? (
              <>
                <section className={`savedPage__featured ${showAllTop ? 'savedPage__featured--expanded' : ''} savedPage__cards`}>
                  {renderCards(featured, 'featured', 'grid')}
                </section>
                {filteredItems.length > 3 && (
                  <div className={`savedPage__showAllRow ${filteredItems.length === 4 ? 'savedPage__showAllRow--mobileOnly' : ''}`}>
                    <button type="button" onClick={() => setShowAllTop((value) => !value)}>{showAllTop ? t('savedPage.collapse') : t('savedPage.showAll')}</button>
                  </div>
                )}
              </>
            ) : null}

            <div className="savedPage__sectionHead">
              <label className="savedPage__sort">
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label={t('savedPage.sortAria')}>
                  <option value="recent">{t('savedPage.sortRecent')}</option>
                  <option value="oldest">{t('savedPage.sortOldest')}</option>
                </select>
                <LuChevronDown aria-hidden="true" />
              </label>
              <div className="savedPage__viewToggle" aria-label={t('savedPage.viewAria')}>
                <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label={t('savedPage.viewGrid')} aria-pressed={view === 'grid'}>
                  <img src={profileIcons.layoutBlack} alt="" />
                </button>
                <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label={t('savedPage.viewList')} aria-pressed={view === 'list'}>
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
            <h2>{isCollectionView ? t('savedPage.collectionEmptyTitle') : t('savedPage.emptyTitle')}</h2>
            <p>
              {isCollectionView
                ? t('savedPage.collectionEmptyBody')
                : t('savedPage.emptyBody')}
            </p>
            {!isCollectionView ? (
              <button type="button" onClick={() => navigate('/first-page')}>{t('savedPage.watchRecommendations')}</button>
            ) : null}
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
        collections={pickerCollections}
        loading={pickerLoading}
        error={pickerError}
        busyIds={busyCollectionIds}
        creating={creatingCollection}
        onClose={() => {
          setCollectionTarget(null);
          setPickerCollections([]);
          setPickerError('');
        }}
        onToggle={toggleCollectionItem}
        onCreate={createCollection}
      />

      {renameOpen ? (
        <div className="savedCollectionModal" role="presentation" onPointerDown={() => !renaming && setRenameOpen(false)}>
          <section
            className="savedCollectionModal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-collection-rename-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <header className="savedCollectionModal__header">
              <h2 id="saved-collection-rename-title">{t('savedPage.renameTitle')}</h2>
              <button type="button" onClick={() => setRenameOpen(false)} aria-label={t('savedPage.closeMenu')}>
                <LuX aria-hidden="true" />
              </button>
            </header>
            <form className="savedCollectionModal__create" onSubmit={confirmRename}>
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder={t('savedPage.renamePlaceholder')}
                maxLength={120}
                disabled={renaming}
                autoFocus
              />
              <button type="submit" disabled={!renameValue.trim() || renaming} aria-label={t('savedPage.rename')}>
                <LuCheck aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <DeletePostConfirmDialog
        isOpen={deleteCollectionOpen}
        onCancel={() => {
          if (!deleting) setDeleteCollectionOpen(false);
        }}
        onConfirm={confirmDeleteCollection}
        confirming={deleting}
        title={t('savedPage.deleteCollectionTitle')}
        description={t('savedPage.deleteCollectionDescription')}
        confirmLabel={deleting ? t('savedPage.deleting') : t('savedPage.deleteCollection')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  );
}

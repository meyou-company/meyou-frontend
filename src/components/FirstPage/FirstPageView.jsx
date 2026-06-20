import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import { useStoriesFeed } from "../../hooks/useStoriesFeed";
import { postsApi } from '../../services/postsApi';
import { storiesApi } from "../../services/storiesApi";
import { useAuthStore } from "../../zustand/useAuthStore";
import { usePostFeedActions } from '../../hooks/usePostFeedActions';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { mapApiPostToFeedItem } from '../../utils/mapApiPostToFeedItem';
import { applyPersistedLikes } from '../../utils/postLikePersistence';
import { getProfileRouteHandle } from '../../utils/profileFriendNav';
import { resolvePostMenuPermissions } from '../../utils/postMenuPermissions';
import AppHeader from "../../components/Layout/AppHeader";
import StoryCircle from "../../components/Stories/StoryCircle";
import NotificationBell from '../../components/Notifications/NotificationBell';
import PostFeedBody from '../../components/PostFeed/PostFeedBody';
import PostCommentsSection from '../PostFeed/PostCommentsSection';
import { isRepostCard, postAuthorDisplayName } from '../../utils/postShareContext';
import PostCardHeader from '../../components/PostFeed/PostCardHeader';
import '../../components/PostFeed/PostCardHeader.scss';
import SharePostModal from '../../components/PostFeed/SharePostModal';
import EditPostModal from '../../components/PostFeed/EditPostModal';
import DeletePostConfirmDialog from '../../components/PostFeed/DeletePostConfirmDialog';
import ImageLightbox from '../../components/PostFeed/ImageLightbox';
import StoryUploadModal from "../../components/Stories/StoryUploadModal";
import StoryViewerModal from "../../components/Stories/StoryViewerModal";
import '../../components/PostFeed/PostFeedBody.scss';
import '../../components/PostFeed/RepostUi.scss';
import '../Users/Profile/ProfileHome/ProfileHome.scss';
import './FirstPageView.scss';

const getReadableFeedError = (error, t) => {
  const text = getApiErrorMessage(error);
  if (!text) return t('feed.error.load');
  if (text === 'Request failed with status code 500') {
    return t('feed.error.server');
  }
  return text;
};
const PAGE_SIZE = 10;
const byNewestPost = (a, b) =>
  new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();

export default function FirstPageView({
  onGoProfile,
  onGoExplore,
  onGoWallet,
  onGoVipChat,
  onGoFriends,
  onGoNotifications,
  onGoHome,
  onOpenProfile,
}) {
  const { t } = useTranslation();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerGroupIndex, setStoryViewerGroupIndex] = useState(0);
  const [storyViewerStoryIndex, setStoryViewerStoryIndex] = useState(0);
  const [storyViewerSessionKey, setStoryViewerSessionKey] = useState(0);

  const findFirstUnviewedStoryIndex = (stories = []) => {
    const index = stories.findIndex(
      (story) => story?.viewedByMe !== true
    );

    return index >= 0 ? index : 0;
  };

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id;
  const cachedUserAvatar =
    typeof window !== "undefined"
      ? window.localStorage.getItem("current-user-avatar")
      : null;

  const currentUserAvatar =
    currentUser?.avatarUrl || currentUser?.avatar || cachedUserAvatar || null;

  useEffect(() => {
    const avatar = currentUser?.avatarUrl || currentUser?.avatar;

    if (avatar) {
      window.localStorage.setItem("current-user-avatar", avatar);
    }
  }, [currentUser]);

  const openLightbox = (images, startIndex = 0) => {
    if (!images?.length) return;
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const moveLightbox = (delta) => {
    setLightboxIndex((prev) => (prev + delta + lightboxImages.length) % lightboxImages.length);
  };

  const navigate = useNavigate();

  const goProfileByUsername = (username) => {
    const value = (username || '').trim();
    if (!value) return;
    navigate(`/profile/${value}`);
  };

  const {
    storiesGroups,
    storiesLoading,
    reloadStories,
    setStoriesGroups,
  } = useStoriesFeed();

  const orderedStoriesGroups = useMemo(() => {
    const list = Array.isArray(storiesGroups) ? [...storiesGroups] : [];

    return list.sort((a, b) => {
      const aIsMe = String(a?.author?.id ?? "") === String(currentUserId ?? "");
      const bIsMe = String(b?.author?.id ?? "") === String(currentUserId ?? "");

      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      return 0;
    });
  }, [storiesGroups, currentUserId]);

  const openStoryViewer = (groupIndex) => {
    const stories = orderedStoriesGroups[groupIndex]?.stories || [];

    setStoryViewerGroupIndex(groupIndex);
    setStoryViewerStoryIndex(findFirstUnviewedStoryIndex(stories));
    setStoryViewerSessionKey((prev) => prev + 1);
    setIsStoryViewerOpen(true);
  };

  const closeStoryViewer = useCallback(() => {
    setIsStoryViewerOpen(false);
  }, []);

  const handleDeleteStory = useCallback(async (storyId) => {
    try {
      await storiesApi.deleteStory(storyId);

      setStoriesGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            stories: (group.stories || []).filter(
              (story) => String(story.id) !== String(storyId)
            ),
          }))
          .filter((group) => group.stories.length > 0)
      );

      closeStoryViewer();
    } catch (error) {
      console.error("Delete story failed", error);
    }
  }, [setStoriesGroups, closeStoryViewer]);

  const markStoryViewedLocally = useCallback((storyId) => {
    setStoriesGroups((prev) =>
      prev.map((group) => ({
        ...group,
        stories: Array.isArray(group?.stories)
          ? group.stories.map((story) =>
            String(story?.id) === String(storyId)
              ? { ...story, viewedByMe: true }
              : story
          )
          : [],
      }))
    );
  }, [setStoriesGroups]);

  const markStoryReactionLocally = useCallback((storyId, reactionType) => {
    setStoriesGroups((prev) =>
      prev.map((group) => ({
        ...group,
        stories: Array.isArray(group?.stories)
          ? group.stories.map((story) =>
            String(story?.id) === String(storyId)
              ? {
                ...story,
                myReaction: reactionType,
              }
              : story
          )
          : [],
      }))
    );
  }, [setStoriesGroups]);

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const FEED_CACHE_KEY = 'first-page-feed-cache';
  const feedActions = usePostFeedActions(setFeedPosts, {
    currentUserId,
    refetchFeed: () => fetchFeedPage(1, { append: false }),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(FEED_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFeedPosts(parsed);
      }
    } catch {
      // ignore broken cache
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(feedPosts));
    } catch {
      // ignore storage errors
    }
  }, [feedPosts]);

  const fetchFeedPage = useCallback(async (page, { append } = { append: false }) => {
    try {
      if (append) setFeedLoadingMore(true);
      else {
        setFeedLoading(true);
        setFeedError(null);
      }

      const list = await postsApi.list({ page, limit: PAGE_SIZE });
      const mapped = (Array.isArray(list) ? list : []).map(mapApiPostToFeedItem).filter(Boolean);
      const withPersistedLikes = applyPersistedLikes(mapped);

      setFeedPosts((prev) => {
        if (!append) return [...withPersistedLikes].sort(byNewestPost);
        const merged = [...prev, ...withPersistedLikes];
        const seen = new Set();
        return merged
          .filter((p) => {
            const id = String(p?.id ?? '');
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .sort(byNewestPost);
      });
      setFeedPage(page);
      setHasMoreFeed(mapped.length === PAGE_SIZE);
    } catch (e) {
      setFeedError(getReadableFeedError(e, t));
      // Keep already loaded posts (or cache) on error to avoid blanking the feed.
      setHasMoreFeed(false);
    } finally {
      if (append) setFeedLoadingMore(false);
      else setFeedLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) {
          await fetchFeedPage(1, { append: false });
        }
      } catch {
        if (!cancelled) {
          // handled inside fetchFeedPage
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchFeedPage]);

  useEffect(() => {
    if (!hasMoreFeed || feedLoading || feedLoadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          fetchFeedPage(feedPage + 1, { append: true });
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreFeed, feedLoading, feedLoadingMore, feedPage, fetchFeedPage]);

  return (
    <div className="first-page-view relative -mx-4 flex min-h-screen w-[calc(100%+2rem)] max-w-[100vw] flex-col overflow-x-hidden pb-10 md:pb-0">
      {/* background */}
      <div
        className="backgroundDark fixed inset-0 z-0 "
        style={{ minHeight: '100dvh' }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col flex-1 w-full min-w-0">
        {/* HEADER */}
        <AppHeader
          onGoProfile={onGoProfile}
          onGoExplore={onGoExplore}
          onGoWallet={onGoWallet}
          onGoVipChat={onGoVipChat}
          onGoHome={onGoHome}
        />

        {/* TABLET / DESKTOP NAV  */}
        <section className="hidden md:block min-w-0 max-w-full overflow-x-clip border-t-[0.1px] border-gray-900 bg-[#FCE9E9]">
          <div className="flex w-full min-w-0 justify-between items-center px-[10px] md:px-[41px] lg:px-9 min-[1440px]:px-[66px] py-3">
            <TabletNav onGoNotifications={onGoNotifications} />
          </div>
        </section>

        {/* STORIES — фон на ширину first-page (уже без px контейнера додатку) */}
        <section className="first-page-stories w-full border-b-[0.1px] border-t-[0.1px] border-gray-900">
          <div className="mx-auto w-full max-w-[1340px] pt-4 md:pt-[23px] md:pb-[19px] xl:pt-4 xl:pb-[13px]">
            <h2 className="mb-1 md:mb-2 xl:mb-4 px-[10px] md:px-[41px] lg:px-9 min-[1440px]:px-[66px] text-black font-[Montserrat] text-base md:text-xl xl:text-[28px]">
              Истории
            </h2>

            <div className="flex gap-3 md:gap-[23px] xl:gap-10 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory snap-center scrollbarHide pl-[10px] pr-[10px] md:pl-[41px] md:pr-[41px] lg:pl-9 lg:pr-9 min-[1440px]:pl-[66px] min-[1440px]:pr-[66px]">

              <StoryCircle
                type="add"
                avatar={currentUserAvatar}
                onClick={() => setIsStoryUploadOpen(true)}
              />

              {!storiesLoading &&
                orderedStoriesGroups.map((group, groupIndex) => {
                  const firstStory = group?.stories?.[0];

                  if (!firstStory) return null;

                  return (
                    <StoryCircle
                      key={group.author?.id || firstStory.id}
                      username={group.author?.username}
                      avatar={group.author?.avatarUrl}
                      viewed={
                        Array.isArray(group.stories) &&
                        group.stories.length > 0 &&
                        group.stories.every((story) => story.viewedByMe === true)
                      }
                      storiesCount={group.stories?.length || 0}
                      onClick={() => openStoryViewer(groupIndex)}
                    />
                  );
                })}
            </div>

          </div>
        </section>

        {/* FEED */}
        <main className="flex-1">
          <div className="feed max-w-[1340px] mx-auto my-[10px] md:my-5 xl:my-[46px] px-3.5 md:px-[41px] lg:px-9 min-[1440px]:px-[66px]">
            {feedLoading && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-gray-600 py-6">
                {t('feed.loading')}
              </p>
            )}
            {!feedLoading && feedPosts.length === 0 && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-gray-600 py-6">
                {t('feed.empty')}
              </p>
            )}
            {!feedLoading &&
              feedPosts.map((post) => (
                <GlobalFeedPostCard
                  key={post.id}
                  post={post}
                  feedActions={feedActions}
                  currentUserId={currentUserId}
                  onOpenProfile={goProfileByUsername}
                  onOpenLightbox={openLightbox}
                  t={t}
                />
              ))}
            {!feedLoading && feedLoadingMore && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-gray-600 py-4">
                {t('feed.loadingMore')}
              </p>
            )}
            {!feedLoading && hasMoreFeed && (
              <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />
            )}
          </div>
        </main>
        <ImageLightbox
          isOpen={isLightboxOpen}
          images={lightboxImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={() => moveLightbox(-1)}
          onNext={() => moveLightbox(1)}
        />

        <StoryUploadModal
          isOpen={isStoryUploadOpen}
          onClose={() => setIsStoryUploadOpen(false)}
          onCreated={() => reloadStories()}
        />

        <StoryViewerModal
          key={storyViewerSessionKey}
          isOpen={isStoryViewerOpen}
          groups={orderedStoriesGroups}
          initialGroupIndex={storyViewerGroupIndex}
          initialStoryIndex={storyViewerStoryIndex}
          currentUserId={currentUserId}
          onClose={closeStoryViewer}
          onViewed={markStoryViewedLocally}
          onDeleteStory={handleDeleteStory}
          onReactionChange={markStoryReactionLocally}
        />

        <SharePostModal
          post={feedActions.sharePost}
          isOpen={Boolean(feedActions.sharePost)}
          onClose={feedActions.closeSharePost}
          onSendToUsers={feedActions.handleSendToUsers}
          onRepostToFeed={feedActions.handleRepostToFeed}
          isReposted={feedActions.sharePost?.viewerState?.isReposted === true}
        />

        <EditPostModal
          post={feedActions.editingPost}
          isOpen={Boolean(feedActions.editingPost)}
          onClose={feedActions.closeEditPost}
          onSave={feedActions.saveEditPost}
          saving={feedActions.isSavingEditPost}
          displayAvatar={
            feedActions.editingPost?.author?.avatarUrl || profileIcons.userStory
          }
        />

        <DeletePostConfirmDialog
          isOpen={Boolean(feedActions.deleteConfirmPost)}
          variant={feedActions.deleteConfirmIsRepost ? "repostRemove" : "delete"}
          onCancel={feedActions.cancelDeletePost}
          onConfirm={feedActions.confirmDeletePost}
          confirming={feedActions.isDeletingPost}
        />
      </div>
    </div>
  );
}

/* ---------- small UI components ---------- */

function NavBtn({ icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className=" p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors"
    >
      <img src={icon} className="w-[30px] h-[30px]" />
    </button>
  );
}

// function StoryCircle({ status, type }) {
//   const isAdd = type === 'add';

//   return (
//     <button className="flex flex-col items-center gap-1">
//       {isAdd ? (
//         <div className="gradientBorder">
//           <div className="relative flex items-center justify-center rounded-full w-14 h-14 md:w-[77px] md:h-[77px] xl:w-[97px] xl:h-[97px] bg-[#D5D5D5]">
//             <img
//               src={profileIcons.plus}
//               alt="add story"
//               aria-hidden="true"
//               className="h-8 md:h-12"
//             />
//           </div>
//         </div>
//       ) : (
//         <div className="relative rounded-full w-14 h-14 border bg-[#D5D5D5] border-[#FF0B0B] flex items-center justify-center md:w-20 md:h-20 xl:w-[100px] xl:h-[100px] xl:border-[3px]">
//           <img
//             src={profileIcons.userStory}
//             alt="user story"
//             className="w-[26px] h-[26px] md:w-12 md:h-12"
//           />

//           {status && (
//             <span
//               className={`absolute right-[2px] top-[2px] md:top-[10px] xl:top-[3px]  w-2.5 h-2.5 md:w-3 md:h-3 xl:w-5 xl:h-5  rounded-full ${
//                 status === 'online' ? 'bg-green-700' : 'bg-zinc-300 border border-black/40'
//               }`}
//             />
//           )}
//         </div>
//       )}

//       <span className="text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline">
//         {isAdd ? 'добавить' : status === 'online' ? 'online' : 'offline'}
//       </span>
//     </button>
//   );
// }

function GlobalFeedPostCard({
  post,
  feedActions,
  currentUserId,
  onOpenProfile,
  onOpenLightbox,
  t,
}) {
  const name = postAuthorDisplayName(post.author, t);
  const avatarSrc = post.author?.avatarUrl || profileIcons.userStory;
  const commentsOpen = feedActions.isCommentsOpen(post.id);
  const authorHandle = getProfileRouteHandle(post.author);
  const handleOpenProfile = () => {
    if (!authorHandle) return;
    onOpenProfile?.(authorHandle);
  };
  const hasProfileLink = Boolean(authorHandle);
  const repost = isRepostCard(post);
  const menuPerms = resolvePostMenuPermissions(post, currentUserId);

  return (
    <article className="first-page-post postCard relative overflow-visible xl:!mb-[29px]">
      <PostCardHeader
        avatarSrc={avatarSrc}
        onAvatarClick={handleOpenProfile}
        avatarDisabled={!hasProfileLink}
        avatarAriaLabel={
          hasProfileLink
            ? t('feed.openProfile', { name })
            : t('feed.profileUnavailable')
        }
        authorName={name}
        createdAt={post.createdAt}
        location={post.location}
        showRepostIcon={repost}
        canShowMenu={menuPerms.canShowMenu}
        canEdit={menuPerms.canEdit}
        canDelete={menuPerms.canDelete}
        canRemoveFromFeed={menuPerms.canRemoveFromFeed}
        onEdit={() => feedActions.openEditPost(post)}
        onDeleteRequest={() => feedActions.requestDeletePost(post)}
        onRemoveFromFeedRequest={() => feedActions.requestDeletePost(post)}
        variant="firstPage"
      />

      <PostFeedBody
        post={post}
        postId={post.id}
        onOpenLightbox={onOpenLightbox}
      />

      <div className="flex justify-center mt-3 xl:!mt-[32px] xl:!mb-[18px]">
        <div className="flex gap-[41px] md:gap-[60px] xl:gap-36">
          <ActionIcon
            icon={profileIcons.like}
            label={String(post.counts.likes)}
            active={post.viewerState.isLiked}
            liked={post.viewerState.isLiked}
            onClick={() => feedActions.onLike(post)}
          />
          <ActionIcon
            icon={profileIcons.comments}
            label={String(post.counts.comments)}
            onClick={() => feedActions.toggleCommentsOpen(post.id)}
          />
          <ActionIcon
            icon={profileIcons.saved}
            label={String(post.counts?.saves ?? 0)}
            active={post.viewerState.isSaved}
            onClick={() => feedActions.onSave(post)}
          />
          <ActionIcon
            icon={profileIcons.share}
            label={String(post.counts.reposts)}
            onClick={() => feedActions.openSharePost(post)}
          />
        </div>
      </div>

      {commentsOpen && (
        <PostCommentsSection
          post={post}
          comments={post.comments}
          commentDraft={feedActions.commentDraft}
          onCommentDraftChange={feedActions.setCommentDraft}
          onSubmitComment={() =>
            feedActions.submitComment(post, feedActions.commentDraft)
          }
          onDeleteComment={(commentId, meta) =>
            feedActions.onDeleteComment(post, commentId, meta)
          }
          onEditComment={(commentId, text, meta) =>
            feedActions.onEditComment(post, commentId, text, meta)
          }
          onLikeComment={(commentId) =>
            feedActions.onLikeComment(post, commentId)
          }
          likingCommentId={feedActions.likingCommentId}
          replyOpenCommentId={feedActions.replyOpenCommentId}
          replyDraft={feedActions.replyDraft}
          onReplyDraftChange={feedActions.setReplyDraft}
          onOpenReplyComposer={feedActions.openReplyComposer}
          onSubmitReply={feedActions.submitReply}
          onShowMoreReplies={feedActions.showMoreReplies}
          variant="firstPage"
        />
      )}
    </article>
  );
}

export const FeedCard = ({ name, time, location, status, text }) => {
  return (
    <article className="first-page-post px-1.5 pt-1.5 pb-[11px] md:p-[10px] xl:!mb-[29px] space-y-3 relative">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-[7px]">
          <div className="relative">
            <img
              src={profileIcons.userStory}
              alt={name}
              className=" h-10  md:h-[60px] xl:h-20 rounded-full object-none bg-gray-300"
            />
            <span
              className={`absolute right-[2px] top-[3px] w-[6px] h-[6px] md:w-2 md:h-2 md:top-[7px] md:right-[3px] rounded-full ${status === 'online' ? 'bg-green-700' : 'bg-zinc-300 border border-gray-900/50'
                }`}
            />
          </div>
          <div className="flex flex-col mt-[5px] gap-[3px]">
            <span className="text-[8px] md:text-xs xl:text-xl text-black font-[Montserrat] underline">
              {time}
            </span>
            <span className="text-xs md:text-sm xl:text-xl font-[Montserrat] underline bg-gradient-to-r from-[#FF4FB1] to-[#4F6BFF] bg-clip-text text-transparent">
              {name}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center mt-[13px] mr-[19px]">
            <img
              src={profileIcons.location}
              alt="location"
              className="w-[4px] h-[5px] mr-1 mt-[1px] md:w-[10px] md:h-[13px]"
            />
            <span className="relative text-[10px] md:text-xs text-pink-500 font-[Montserrat] mr-[7px] inline-block">
              {location}
              <span className="absolute bottom-[2px] left-0 right-0 h-[0.5px] bg-pink-500"></span>
            </span>
          </div>
        </div>
      </div>

      {/* Text */}
      <p className="postText">{text}</p>

      {/* Actions */}
      <div className="flex justify-center mt-3 xl:!mt-[52px] xl:!mb-[38px]">
        <div className="flex gap-[41px] md:gap-[60px] xl:gap-36">
          <ActionIcon icon={profileIcons.like} label="125" />
          <ActionIcon icon={profileIcons.comments} label="256" />
          <ActionIcon icon={profileIcons.savedPost} label="21" />
          <ActionIcon icon={profileIcons.share} label="24" />
        </div>
      </div>
    </article>
  );
};

function ActionIcon({ icon, label, active, liked, onClick }) {
  const className = `flex flex-col items-center text-[10px] md:text-xs font-[Montserrat] text-black ${onClick ? 'cursor-pointer' : 'cursor-default opacity-95'
    } ${active ? 'opacity-100' : 'opacity-90'}`;
  const inner = (
    <>
      <img
        src={icon}
        alt=""
        className={`h-6 md:h-9 xl:h-11 pointer-events-none ${active ? 'opacity-100' : 'opacity-80'} ${liked ? 'brightness-0 saturate-100 [filter:brightness(0)_saturate(100%)_invert(55%)_sepia(42%)_saturate(2211%)_hue-rotate(299deg)_brightness(103%)_contrast(97%)]' : ''}`}
      />
      <span
        className={`text-[8px] md:text-xs xl:text-xl font-normal xl:font-bold font-['Montserrat'] ${active ? 'text-pink-500' : 'text-black'}`}
      >
        {label}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={className} aria-hidden="true">
        {inner}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

const TabletNav = ({ onGoNotifications }) => {
  const navigate = useNavigate();

  return (
    <nav className="w-full min-w-0">
      <div className="flex w-full min-w-0 justify-between gap-2 md:gap-4 lg:gap-8 xl:gap-10">
        {/* 1 кнопка */}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.home}
            alt=""
            className="app-header-tablet-nav__icon xl:hidden"
            aria-hidden="true"
          />

          <img
            src={profileIcons.plus}
            alt=""
            className="app-header-tablet-nav__icon hidden xl:block"
            aria-hidden="true"
          />
        </button>

        {/* Остальные без изменений */}

        <button
          type="button"
          onClick={() => navigate('/video')}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.video}
            alt=""
            className="app-header-tablet-nav__icon hidden md:block"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => navigate('/friends')}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.friends}
            alt=""
            className="app-header-tablet-nav__icon"
            aria-hidden="true"
          />
        </button>

        <NotificationBell onGoNotifications={onGoNotifications} />
      </div>
    </nav>
  );
};

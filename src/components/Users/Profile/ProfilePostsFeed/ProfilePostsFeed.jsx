import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import profileIcons from '../../../../constants/profileIcons';
import PostCommentsSection from '../../../PostFeed/PostCommentsSection';
import PostFeedBody from '../../../PostFeed/PostFeedBody';
import '../../../PostFeed/PostFeedBody.scss';
import '../../../PostFeed/RepostUi.scss';
import { RepostHeaderIcon } from '../../../PostFeed/RepostUi';
import { isRepostCard, postAuthorDisplayName } from '../../../../utils/postShareContext';
import SharePostModal from '../../../PostFeed/SharePostModal';
import ImageLightbox from '../../../PostFeed/ImageLightbox';

/**
 * Стрічка постів профілю (як у ProfileHome): завантаження даних — у useProfileAuthorFeed.
 */
export default function ProfilePostsFeed({
  feedPosts,
  feedLoading,
  feedError,
  feedActions,
  displayAvatar,
  titleName,
  onViewProfileAvatar,
  sectionClassName = 'feed',
}) {
  const [openPostMenuId, setOpenPostMenuId] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [searchParams] = useSearchParams();

  const targetPostId = searchParams.get('post');

  useEffect(() => {
    if (openPostMenuId == null) return;
    const onDocClick = () => setOpenPostMenuId(null);
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpenPostMenuId(null);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [openPostMenuId]);

  useEffect(() => {
    if (!targetPostId || !feedPosts.length) return;

    const timeout = setTimeout(() => {
      const element = document.getElementById(`post-${targetPostId}`);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        element.classList.add('highlight-post');

        setTimeout(() => {
          element.classList.remove('highlight-post');
        }, 2000);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [targetPostId, feedPosts]);

  const openPostImageViewer = (images, startIndex = 0) => {
    const list = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!list.length) return;
    const safeIndex = Math.min(Math.max(Number(startIndex) || 0, 0), list.length - 1);
    setLightboxImages(list);
    setLightboxIndex(safeIndex);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const moveLightbox = (delta) => {
    if (!lightboxImages.length) return;
    setLightboxIndex((prev) => (prev + delta + lightboxImages.length) % lightboxImages.length);
  };

  return (
    <>
      <section className={sectionClassName}>
        {feedLoading && (
          <p className="feedLoadingHint" aria-live="polite">
            Завантаження постів…
          </p>
        )}
        {!feedLoading && feedError && (
          <p className="feedErrorHint" role="alert">
            {feedError}
          </p>
        )}
        {!feedLoading && !feedError && feedPosts.length === 0 && (
          <p className="feedEmptyHint">Поки немає постів</p>
        )}
        {feedPosts.map((post) => {
          const repost = isRepostCard(post);
          const headerName = repost
            ? postAuthorDisplayName(post.author)
            : titleName;
          const headerAvatar =
            (repost && post.author?.avatarUrl) || displayAvatar;

          return (
          <article
            id={`post-${post.id}`}
            key={post.id}
            className={`postCard${post.permissions?.canEdit ? ' postCard--canEdit' : ''}${post.permissions?.canDelete ? ' postCard--canDelete' : ''}`}
            data-can-edit={post.permissions?.canEdit === true ? 'true' : 'false'}
            data-can-delete={post.permissions?.canDelete === true ? 'true' : 'false'}
          >
            <div className="postTop">
              <div className="postTopLeft">
                <button
                  type="button"
                  className="postAvatarBtn"
                  onClick={() => onViewProfileAvatar?.()}
                  aria-label="Переглянути фото"
                >
                  <img src={headerAvatar} className="postAvatar" alt="" />
                </button>

                <div className="postHeadText">
                  {!repost && <div className="postLabel">new post</div>}
                  <div className="postAuthorRow">
                    <div className="postAuthor">{headerName}</div>
                    {repost ? <RepostHeaderIcon /> : null}
                  </div>
                </div>
              </div>

              <div className="postTopRight">
                {post.permissions?.canDelete === true && (
                  <div className="postMenuWrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="postMenuBtn"
                      type="button"
                      aria-label="Меню поста"
                      aria-expanded={openPostMenuId === post.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPostMenuId((prev) => (prev === post.id ? null : post.id));
                      }}
                    >
                      •••
                    </button>
                    {openPostMenuId === post.id && (
                      <div className="postMenuDropdown" role="menu" aria-label="Дії з постом">
                        <button
                          className="postMenuDeleteBtn"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenPostMenuId(null);
                            feedActions.onDeletePost(post);
                          }}
                        >
                          Видалити
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="postLocation">
                  <img
                    className="postLocationIcon"
                    src={profileIcons.location || '/home/location.svg'}
                    alt=""
                  />
                  <span className="postLocationText">{post.location || '—'}</span>
                </div>
              </div>
            </div>

            <PostFeedBody
              post={post}
              postId={post.id}
              onOpenLightbox={openPostImageViewer}
            />

            <div className="postActions">
              <button
                className={`postActionBtn ${post.viewerState?.isLiked ? 'postActionBtn--active postActionBtn--liked' : ''}`}
                type="button"
                aria-label="like"
                aria-pressed={post.viewerState?.isLiked === true}
                onClick={() => feedActions.onLike(post)}
              >
                <img
                  src={profileIcons.like || '/home/like.svg'}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.counts?.likes ?? 0}</span>
              </button>

              <button
                className="postActionBtn"
                type="button"
                aria-label="comment"
                onClick={() => feedActions.toggleCommentsOpen(post.id)}
              >
                <img
                  src={profileIcons.comments || '/home/comments.svg'}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.counts?.comments ?? 0}</span>
              </button>

              <button
                className={`postActionBtn ${post.viewerState?.isSaved ? 'postActionBtn--active' : ''}`}
                type="button"
                aria-label="save"
                aria-pressed={post.viewerState?.isSaved === true}
                onClick={() => feedActions.onSave(post)}
              >
                <img
                  src={profileIcons.saved || '/icon1/saved.svg'}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.counts?.saves ?? 0}</span>
              </button>

              <button
                className="postActionBtn"
                type="button"
                aria-label="Поділитися"
                onClick={() => feedActions.openSharePost(post)}
              >
                <img
                  src={profileIcons.share || '/home/to-share.svg'}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.counts?.reposts ?? 0}</span>
              </button>
            </div>

            {feedActions.isCommentsOpen(post.id) && (
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
                replyOpenCommentId={feedActions.replyOpenCommentId}
                replyDraft={feedActions.replyDraft}
                onReplyDraftChange={feedActions.setReplyDraft}
                onOpenReplyComposer={feedActions.openReplyComposer}
                onSubmitReply={feedActions.submitReply}
                onShowMoreReplies={feedActions.showMoreReplies}
                variant="profile"
              />
            )}
          </article>
          );
        })}
      </section>

      <ImageLightbox
        isOpen={isLightboxOpen}
        images={lightboxImages}
        index={lightboxIndex}
        onClose={closeLightbox}
        onPrev={() => moveLightbox(-1)}
        onNext={() => moveLightbox(1)}
      />

      <SharePostModal
        post={feedActions.sharePost}
        isOpen={Boolean(feedActions.sharePost)}
        onClose={feedActions.closeSharePost}
        onSendToUsers={feedActions.handleSendToUsers}
        onRepostToFeed={feedActions.handleRepostToFeed}
        isReposted={feedActions.sharePost?.viewerState?.isReposted === true}
      />
    </>
  );
}

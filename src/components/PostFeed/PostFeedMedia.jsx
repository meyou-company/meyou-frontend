import { hasPostMedia, splitPostMedia } from "../../utils/postMedia";
import PostMediaGallery from "./PostMediaGallery";

/**
 * Медіа поста в стрічці — рендериться лише якщо є валідний URL.
 */
export default function PostFeedMedia({
  post,
  postId,
  onOpenLightbox,
  videoWrapperClassName = "postMedia",
  videoClassName = "postMediaImg",
}) {
  if (!hasPostMedia(post)) return null;

  const { images, videos } = splitPostMedia(post);
  if (images.length === 0 && videos.length === 0) return null;

  const id = postId ?? post?.id ?? "post";

  return (
    <>
      {images.length > 0 && (
        <PostMediaGallery mediaItems={images} onOpenLightbox={onOpenLightbox} />
      )}
      {videos.map((mediaItem) => (
        <div
          className={videoWrapperClassName}
          key={`${id}-${mediaItem.order}-${mediaItem.url}`}
        >
          <video
            src={mediaItem.url}
            className={videoClassName}
            controls
            preload="metadata"
          />
        </div>
      ))}
    </>
  );
}

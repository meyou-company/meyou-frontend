import PostFeedMedia from "./PostFeedMedia";
import { RepostEmbedLabel } from "./RepostUi";
import { isRepostCard, postAuthorDisplayName } from "../../utils/postShareContext";
import "./PostFeedBody.scss";
import "./RepostUi.scss";

/**
 * Текст + медіа поста. Репости (originalPostId + originalPost).
 */
export default function PostFeedBody({ post, postId, onOpenLightbox }) {
  if (isRepostCard(post)) {
    const original = post.originalPost;
    const originalText = (original?.text ?? "").trim();

    return (
      <div className="postShare">
        <RepostEmbedLabel author={post.author} />
        <div className="postShare__embed">
          <p className="postShare__embedAuthor">
            {postAuthorDisplayName(original?.author)}
          </p>
          {originalText ? (
            <p className="postText postShare__embedText">{originalText}</p>
          ) : null}
          <PostFeedMedia
            post={original}
            postId={original?.id ?? postId}
            onOpenLightbox={onOpenLightbox}
          />
        </div>
      </div>
    );
  }

  const text = (post?.text ?? "").trim();

  return (
    <>
      {text ? <p className="postText">{text}</p> : null}
      <PostFeedMedia
        post={post}
        postId={postId ?? post?.id}
        onOpenLightbox={onOpenLightbox}
      />
    </>
  );
}

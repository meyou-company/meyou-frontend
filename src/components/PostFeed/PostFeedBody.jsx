import { useState } from "react";
import { useTranslation } from "react-i18next";
import PostFeedMedia from "./PostFeedMedia";
import { RepostEmbedLabel } from "./RepostUi";
import { isRepostCard, postAuthorDisplayName } from "../../utils/postShareContext";
import {
  getPostTextPreview,
  shouldExpandPostText,
} from "../../utils/postText";
import "./PostFeedBody.scss";
import "./RepostUi.scss";

/**
 * Feed/profile preview: ≤200 chars shown in full; longer posts expand in place.
 * Does not use the card ⋮ menu.
 */
export function PostExpandableText({ text, className = "postText" }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const raw = text ?? "";
  if (!raw.trim()) return null;

  const canExpand = shouldExpandPostText(raw);
  const shown = !canExpand || expanded ? raw : getPostTextPreview(raw);

  return (
    <div className="postTextExpand">
      <p className={className}>{shown}</p>
      {canExpand ? (
        <button
          type="button"
          className="postTextExpand__toggle"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? t("posts.collapse") : t("posts.readMore")}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Текст + медіа поста. Репости (originalPostId + originalPost).
 */
export default function PostFeedBody({ post, postId, onOpenLightbox }) {
  if (isRepostCard(post)) {
    const original = post.originalPost;

    return (
      <div className="postShare">
        <RepostEmbedLabel author={post.author} />
        <div className="postShare__embed">
          <p className="postShare__embedAuthor">
            {postAuthorDisplayName(original?.author)}
          </p>
          <PostExpandableText
            text={original?.text}
            className="postText postShare__embedText"
          />
          <PostFeedMedia
            post={original}
            postId={original?.id ?? postId}
            onOpenLightbox={onOpenLightbox}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <PostExpandableText text={post?.text} />
      <PostFeedMedia
        post={post}
        postId={postId ?? post?.id}
        onOpenLightbox={onOpenLightbox}
      />
    </>
  );
}

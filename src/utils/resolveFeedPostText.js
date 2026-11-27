/**
 * Unified caption for feed cards (API DTO or mapped feed item).
 */
export function resolveFeedPostText(post) {
  if (!post || typeof post !== "object") return "";
  const raw =
    post.text ??
    post.fullText ??
    post.shortText ??
    post.repostText ??
    "";
  return typeof raw === "string" ? raw : "";
}
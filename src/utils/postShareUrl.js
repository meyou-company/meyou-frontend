export const POST_SHARE_TEXT = "Подивись цей пост";

/** Базовий origin для публічних посилань (не localhost у prod, якщо задано VITE_PUBLIC_APP_URL). */
export function getPublicAppOrigin() {
  const fromEnv =
    import.meta.env.VITE_PUBLIC_APP_URL?.trim() ||
    import.meta.env.VITE_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Публічне посилання на пост для зовнішнього шеру. */
export function buildPostShareUrl(postId) {
  if (!postId) return "";
  const origin = getPublicAppOrigin();
  const path = `/posts/${encodeURIComponent(postId)}`;
  if (!origin) return path;
  return `${origin}${path}`;
}

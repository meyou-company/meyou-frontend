import { getPostShareText } from "./postShareUrl";

export function buildTelegramShareUrl(postUrl, text = getPostShareText()) {
  const params = new URLSearchParams();
  params.set("url", postUrl);
  if (text) params.set("text", text);
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildWhatsAppShareUrl(postUrl, text = getPostShareText()) {
  const combined = text ? `${text} ${postUrl}` : postUrl;
  return `https://wa.me/?text=${encodeURIComponent(combined)}`;
}

export function buildFacebookShareUrl(postUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
}

export function buildTwitterShareUrl(postUrl, text = getPostShareText()) {
  const params = new URLSearchParams();
  params.set("url", postUrl);
  if (text) params.set("text", text);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openExternalShareUrl(url) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function canUseSystemShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareViaSystem({ postUrl, title = "Me&You", text = getPostShareText() }) {
  if (!canUseSystemShare()) {
    throw new Error("System share is not available");
  }
  await navigator.share({
    title,
    text,
    url: postUrl,
  });
}

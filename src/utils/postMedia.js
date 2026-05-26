/** Нормалізований URL з елемента media або рядкового поля. */
function pickMediaUrl(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const u = value.url ?? value.mediaUrl ?? value.imageUrl ?? "";
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

/**
 * Усі валідні медіа поста (з масиву media та legacy-полів API).
 */
export function getPostMediaItems(post) {
  if (!post) return [];

  const fromArray = (Array.isArray(post.media) ? post.media : [])
    .map((m, idx) => {
      const url = pickMediaUrl(m);
      if (!url) return null;
      const typeRaw = String(m?.type ?? "").toUpperCase();
      return {
        url,
        type: typeRaw === "VIDEO" ? "VIDEO" : "IMAGE",
        order: Number.isFinite(m?.order) ? Number(m.order) : idx,
      };
    })
    .filter(Boolean);

  if (fromArray.length > 0) {
    return fromArray.sort((a, b) => a.order - b.order);
  }

  const legacy = [];
  const pushUnique = (url, type = "IMAGE") => {
    if (!url || legacy.some((m) => m.url === url)) return;
    legacy.push({ url, type, order: legacy.length });
  };

  pushUnique(pickMediaUrl(post.imageUrl), "IMAGE");
  pushUnique(pickMediaUrl(post.mediaUrl), "IMAGE");
  pushUnique(pickMediaUrl(post.videoUrl), "VIDEO");

  if (Array.isArray(post.images)) {
    post.images.forEach((img) => pushUnique(pickMediaUrl(img), "IMAGE"));
  }

  return legacy;
}

export function hasPostMedia(post) {
  return getPostMediaItems(post).length > 0;
}

export function splitPostMedia(post) {
  const items = getPostMediaItems(post);
  return {
    images: items.filter((m) => m.type !== "VIDEO"),
    videos: items.filter((m) => m.type === "VIDEO"),
  };
}

const LIKES_KEY = "post-liked-overrides";

function readMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LIKES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIKES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function persistPostLike(postId, isLiked) {
  if (!postId) return;
  const map = readMap();
  map[String(postId)] = isLiked === true;
  writeMap(map);
}

export function clearPostLikeOverride(postId) {
  if (!postId) return;
  const map = readMap();
  delete map[String(postId)];
  writeMap(map);
}

export function applyPersistedLikes(posts) {
  const list = Array.isArray(posts) ? posts : [];
  const map = readMap();
  if (!Object.keys(map).length) return list;
  return list.map((p) => {
    const id = String(p?.id ?? "");
    if (!id || !(id in map)) return p;
    const liked = map[id] === true;
    const prevLiked = p?.viewerState?.isLiked === true;
    const prevCount = Number(p?.counts?.likes ?? 0);
    const nextCount = liked === prevLiked ? prevCount : Math.max(0, prevCount + (liked ? 1 : -1));
    return {
      ...p,
      viewerState: { ...p.viewerState, isLiked: liked },
      counts: { ...p.counts, likes: nextCount },
    };
  });
}


import { DEFAULT_VIDEO_THUMBNAIL } from "./videoThumbnail";

export function formatVideoCount(value) {
  const num = Number(value) || 0;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(num);
}

export function getAuthorDisplayName(author) {
  if (!author) return "";
  const first = author.firstName?.trim() || "";
  const last = author.lastName?.trim() || "";
  const full = `${first} ${last}`.trim();
  return full || author.username || "";
}

export function getVideoLocation(location) {
  if (!location) return "";
  if (typeof location === "string") return location.trim();
  if (typeof location === "object") {
    return (
      location.label?.trim() ||
      location.city?.trim() ||
      location.country?.trim() ||
      ""
    );
  }
  return "";
}

export function mapApiVideoToCard(video) {
  if (!video) return null;

  return {
    id: video.id,
    authorId: video.author?.id ?? null,
    name: getAuthorDisplayName(video.author),
    location: getVideoLocation(video.location),
    thumbnailUrl: video.thumbnailUrl || null,
    likesCount: Math.max(0, Number(video.likesCount) || 0),
    likes: formatVideoCount(video.likesCount),
    views: formatVideoCount(video.viewsCount),
    comments: formatVideoCount(video.commentsCount),
    videoUrl: video.videoUrl,
    title: video.title || "",
    isLikedByMe: Boolean(video.isLikedByMe),
    isSavedByMe: Boolean(video.isSavedByMe),
    raw: video,
  };
}

export function mapApiVideosToCards(videos) {
  if (!Array.isArray(videos)) return [];
  return videos.map(mapApiVideoToCard).filter(Boolean);
}

export { DEFAULT_VIDEO_THUMBNAIL };

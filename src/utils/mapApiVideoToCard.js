const DEFAULT_THUMBNAIL = "/foon2.png";

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
  return location.city?.trim() || location.country?.trim() || "";
}

export function mapApiVideoToCard(video) {
  if (!video) return null;

  return {
    id: video.id,
    name: getAuthorDisplayName(video.author),
    location: getVideoLocation(video.location),
    image: video.thumbnailUrl || DEFAULT_THUMBNAIL,
    likes: formatVideoCount(video.likesCount),
    comments: formatVideoCount(video.commentsCount),
    videoUrl: video.videoUrl,
    title: video.title,
    isLikedByMe: Boolean(video.isLikedByMe),
    isSavedByMe: Boolean(video.isSavedByMe),
    raw: video,
  };
}

export function mapApiVideosToCards(videos) {
  if (!Array.isArray(videos)) return [];
  return videos.map(mapApiVideoToCard).filter(Boolean);
}

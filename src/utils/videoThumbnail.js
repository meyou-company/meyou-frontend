export const DEFAULT_VIDEO_THUMBNAIL = "/foon2.png";

export function isDefaultVideoThumbnail(url) {
  if (!url || typeof url !== "string") return true;
  return url === DEFAULT_VIDEO_THUMBNAIL || url.endsWith("/foon2.png");
}

function parseCloudinaryAsset(videoUrl) {
  try {
    const clean = String(videoUrl).split("?")[0];
    const url = new URL(clean);
    if (!/cloudinary\.com/i.test(url.hostname)) return null;

    const uploadMarker = "/upload/";
    const uploadIndex = clean.indexOf(uploadMarker);
    if (uploadIndex === -1) return null;

    const resourceMatch = clean.match(/\/(video|image)\/upload\//);
    const resourceType = resourceMatch?.[1] || "video";

    const pathParts = url.pathname.split("/").filter(Boolean);
    const cloudName = pathParts[0];
    if (!cloudName) return null;

    let remainder = clean.slice(uploadIndex + uploadMarker.length);
    const segments = remainder.split("/").filter((segment) => !segment.includes(","));
    remainder = segments.join("/");
    remainder = remainder.replace(/^v\d+\//, "");
    const publicId = remainder.replace(/\.[^/.]+$/, "");

    if (!publicId) return null;

    return {
      origin: url.origin,
      cloudName,
      resourceType,
      publicId,
    };
  } catch {
    return null;
  }
}

/**
 * Cloudinary delivery URL for a JPG frame extracted from a hosted video.
 */
export function buildCloudinaryVideoThumbnail(videoUrl, seekSeconds = 1) {
  const asset = parseCloudinaryAsset(videoUrl);
  if (!asset) return null;

  const transforms = `so_${seekSeconds},w_600,h_400,c_fill,f_jpg`;
  return `${asset.origin}/${asset.cloudName}/video/upload/${transforms}/${asset.publicId}.jpg`;
}

export function getVideoThumbnailCandidates(thumbnailUrl, videoUrl) {
  const candidates = [];

  const add = (url) => {
    if (url && typeof url === "string" && !candidates.includes(url)) {
      candidates.push(url);
    }
  };

  if (thumbnailUrl && !isDefaultVideoThumbnail(thumbnailUrl)) {
    add(thumbnailUrl);
  }

  if (videoUrl) {
    add(buildCloudinaryVideoThumbnail(videoUrl, 1));
    add(buildCloudinaryVideoThumbnail(videoUrl, 0));
    add(buildCloudinaryVideoThumbnail(videoUrl, 2));
  }

  return candidates;
}

export function resolveVideoThumbnailUrl(thumbnailUrl, videoUrl) {
  return getVideoThumbnailCandidates(thumbnailUrl, videoUrl)[0] || null;
}

export function canLoadImageUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

/**
 * Capture a frame from a video URL when Cloudinary transforms are unavailable.
 */
export function captureVideoFrameThumbnail(videoUrl, seekSeconds = 1) {
  return new Promise((resolve) => {
    if (!videoUrl) {
      resolve(null);
      return;
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(value);
    };

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };

    const drawFrame = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        finish(canvas.toDataURL("image/jpeg", 0.85) || null);
      } catch {
        finish(null);
      }
    };

    const timeoutId = window.setTimeout(() => finish(null), 10000);

    video.onloadedmetadata = () => {
      const duration = Number(video.duration) || 0;
      const target =
        duration > 0
          ? Math.min(Math.max(seekSeconds, 0), Math.max(0, duration - 0.05))
          : 0;
      video.currentTime = target;
    };

    video.onseeked = drawFrame;

    video.onerror = () => finish(null);

    video.src = videoUrl;
  });
}

export async function resolveVideoCardThumbnail(thumbnailUrl, videoUrl) {
  for (const candidate of getVideoThumbnailCandidates(thumbnailUrl, videoUrl)) {
    const loaded = await canLoadImageUrl(candidate);
    if (loaded) return candidate;
  }

  if (videoUrl) {
    for (const seekSeconds of [1, 0, 2]) {
      const frame = await captureVideoFrameThumbnail(videoUrl, seekSeconds);
      if (frame) return frame;
    }
  }

  return DEFAULT_VIDEO_THUMBNAIL;
}

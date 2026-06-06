import { useEffect, useState } from "react";
import {
  DEFAULT_VIDEO_THUMBNAIL,
  resolveVideoCardThumbnail,
} from "../../utils/videoThumbnail";

export default function VideoCardThumbnail({
  thumbnailUrl,
  videoUrl,
  alt = "",
  className = "",
}) {
  const [src, setSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setIsLoading(true);
      setSrc(null);

      const resolved = await resolveVideoCardThumbnail(thumbnailUrl, videoUrl);
      if (cancelled) return;

      setSrc(resolved);
      setIsLoading(false);
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, videoUrl]);

  if (isLoading) {
    return (
      <div
        className={`${className} video-card__previewPlaceholder`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src || DEFAULT_VIDEO_THUMBNAIL}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        setSrc(DEFAULT_VIDEO_THUMBNAIL);
      }}
    />
  );
}

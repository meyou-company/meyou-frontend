import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../utils/lunaAssets";
import { getLunmeyoItem } from "../../constants/lunmeyoCatalog";
import "./LunmeyoMedia.scss";

const playing = new Set();
const MAX_PLAYING = 3;

function pauseOldest() {
  while (playing.size > MAX_PLAYING) {
    const first = playing.values().next().value;
    if (!first) break;
    playing.delete(first);
    try {
      first.pause();
    } catch {
      /* ignore */
    }
  }
}

export default function LunmeyoMedia({
  item,
  itemId,
  size = "message",
  className = "",
  autoPlay = true,
}) {
  const resolved = item || getLunmeyoItem(itemId);
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !autoPlay) return undefined;
    const reduced = prefersReducedMotion();
    if (reduced) return undefined;

    const onPlay = () => {
      playing.add(el);
      pauseOldest();
    };
    const onPause = () => playing.delete(el);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    const playPromise = el.play();
    if (playPromise?.catch) playPromise.catch(() => {});
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      playing.delete(el);
      el.pause();
    };
  }, [autoPlay, resolved?.src]);

  if (!resolved?.src) return null;

  const classes = ["lunmeyoMedia", `lunmeyoMedia--${size}`, `lunmeyoMedia--${resolved.type}`, className]
    .filter(Boolean)
    .join(" ");

  if (resolved.type === "mp4") {
    return (
      <video
        ref={videoRef}
        className={classes}
        src={resolved.src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={resolved.id}
      />
    );
  }

  return (
    <img
      className={classes}
      src={resolved.src}
      alt=""
      draggable={false}
      loading="lazy"
    />
  );
}

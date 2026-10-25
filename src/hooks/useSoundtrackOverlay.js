import { useEffect, useRef } from "react";
import { epidemicSoundApi } from "../services/epidemicSoundApi";

export function useSoundtrackOverlay({
  soundtrack,
  videoRef,
  isImage = false,
  enabled = true,
}) {
  const audioRef = useRef(null);
  const startSec = soundtrack?.startSec ?? 0;
  const endSec = soundtrack?.endSec ?? 15;
  const musicVolume = soundtrack?.musicVolume ?? 0.8;
  const originalVolume = soundtrack?.originalVolume ?? 0.4;
  const trackId = soundtrack?.id;

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return undefined;

    if (!enabled || !trackId) {
      video.volume = 1;
      return undefined;
    }

    video.muted = originalVolume <= 0;
    video.volume = Math.max(0, Math.min(1, originalVolume));
    return undefined;
  }, [enabled, originalVolume, trackId, videoRef]);

  useEffect(() => {
    if (!enabled || !trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    audioRef.current = audio;

    const clipLength = Math.max(0.5, endSec - startSec);

    const wrapToClip = (mediaTime = 0) => {
      const offset = Number.isFinite(mediaTime) ? mediaTime % clipLength : 0;
      audio.currentTime = startSec + offset;
    };

    const onTimeUpdate = () => {
      if (audio.currentTime >= endSec || audio.currentTime < startSec - 0.05) {
        audio.currentTime = startSec;
      }
    };

    const onEnded = () => {
      audio.currentTime = startSec;
      audio.play().catch(() => {});
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    const video = videoRef?.current;
    const onPlay = () => {
      wrapToClip(video?.currentTime || 0);
      audio.play().catch(() => {});
    };
    const onPause = () => audio.pause();
    const onSeeked = () => wrapToClip(video?.currentTime || 0);

    if (video && !isImage) {
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("seeked", onSeeked);
    }

    epidemicSoundApi
      .getPreview(trackId)
      .then(({ url }) => {
        if (cancelled) return;
        audio.src = url;
        wrapToClip(isImage ? 0 : video?.currentTime || 0);
        if (isImage || (video && !video.paused)) {
          audio.play().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      if (video && !isImage) {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("seeked", onSeeked);
      }
      audio.removeAttribute("src");
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [enabled, endSec, isImage, startSec, trackId, videoRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
    }
  }, [musicVolume]);
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { epidemicSoundApi } from "../../services/epidemicSoundApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import {
  clampClip,
  createSoundtrackSelection,
  formatArtists,
  formatClipTime,
} from "../../utils/soundtrackClip";
import "./MusicPicker.scss";

function Cover({ src }) {
  if (src) {
    return <img src={src} alt="" className="musicPicker__cover" />;
  }
  return (
    <span className="musicPicker__cover musicPicker__cover--empty" aria-hidden="true">
      🎵
    </span>
  );
}

export function SoundtrackChip({ soundtrack, onChange, onRemove, disabled }) {
  const { t } = useTranslation();
  if (!soundtrack?.id) return null;

  return (
    <div className="soundtrackChip">
      <Cover src={soundtrack.imageUrl} />
      <div className="soundtrackChip__meta">
        <strong>{soundtrack.title}</strong>
        <span>{formatArtists(soundtrack.artists) || t("musicPicker.selected")}</span>
      </div>
      <button
        type="button"
        className="soundtrackChip__btn"
        onClick={onChange}
        disabled={disabled}
      >
        {t("musicPicker.change")}
      </button>
      <button
        type="button"
        className="soundtrackChip__btn soundtrackChip__btn--ghost"
        onClick={onRemove}
        disabled={disabled}
      >
        {t("musicPicker.remove")}
      </button>
    </div>
  );
}

export default function MusicPicker({
  isOpen,
  onClose,
  onSelect,
  selected,
  showOriginalVolume = false,
}) {
  const { t } = useTranslation();
  const searchRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [term, setTerm] = useState("");
  const [tracks, setTracks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [draft, setDraft] = useState(selected || null);
  const [playingId, setPlayingId] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    setDraft(selected || null);
    setTerm("");
    setTracks([]);
    setPlayingId("");
    const timer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, selected]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose?.();
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      previewAudioRef.current?.pause();
      setPlayingId("");
    }
  }, [isOpen]);

  useEffect(() => {
    const query = term.trim();
    if (!isOpen || query.length < 2) {
      setTracks([]);
      setIsSearching(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await epidemicSoundApi.searchTracks(query, { limit: 10 });
        if (!cancelled) setTracks(results);
      } catch (error) {
        if (!cancelled) {
          setTracks([]);
          toast.error(getApiErrorMessage(error) || t("musicPicker.searchError"));
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, t, term]);

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    if (previewAudioRef.current) {
      previewAudioRef.current.removeAttribute("src");
      previewAudioRef.current.load();
    }
    setPlayingId("");
  };

  const playPreview = async (track) => {
    if (playingId === track.id) {
      stopPreview();
      return;
    }

    try {
      const { url } = await epidemicSoundApi.getPreview(track.id);
      stopPreview();
      const audio = new Audio(url);
      const clip = createSoundtrackSelection(track, draft?.id === track.id ? draft : undefined);
      audio.currentTime = clip.startSec;
      audio.volume = clip.musicVolume;
      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= clip.endSec) {
          audio.pause();
          setPlayingId("");
        }
      });
      previewAudioRef.current = audio;
      await audio.play();
      setPlayingId(track.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error) || t("musicPicker.previewError"));
    }
  };

  const updateDraft = (patch) => {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      const clip = clampClip({
        startSec: next.startSec,
        endSec: next.endSec,
        lengthSec: next.lengthSec,
      });
      return { ...next, ...clip };
    });
  };

  const handleUseTrack = (track) => {
    stopPreview();
    const next = createSoundtrackSelection(track, {
      musicVolume: draft?.musicVolume,
      originalVolume: draft?.originalVolume,
    });
    setDraft(next);
    onSelect?.(next);
  };

  const handleDone = () => {
    if (draft?.id) onSelect?.(draft);
    stopPreview();
    onClose?.();
  };

  const handleRemove = () => {
    stopPreview();
    setDraft(null);
    onSelect?.(null);
    onClose?.();
  };

  const hint = useMemo(() => {
    if (term.trim().length > 0 && term.trim().length < 2) {
      return t("musicPicker.searchHint");
    }
    if (!isSearching && term.trim().length >= 2 && tracks.length === 0) {
      return t("musicPicker.empty");
    }
    return "";
  }, [isSearching, t, term, tracks.length]);

  if (!isOpen) return null;

  return (
    <div className="musicPicker" role="dialog" aria-modal="true" aria-labelledby="music-picker-title">
      <button
        type="button"
        className="musicPicker__backdrop"
        aria-label={t("common.close", { defaultValue: "Close" })}
        onClick={onClose}
      />
      <div className="musicPicker__panel">
        <header className="musicPicker__head">
          <h2 id="music-picker-title">{t("musicPicker.title")}</h2>
          <button type="button" className="musicPicker__close" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="musicPicker__notice">{t("musicPicker.localTestOnly")}</p>

        <label className="musicPicker__search">
          <span className="musicPicker__srOnly">{t("musicPicker.searchPlaceholder")}</span>
          <input
            ref={searchRef}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("musicPicker.searchPlaceholder")}
            autoComplete="off"
          />
        </label>

        {draft?.id ? (
          <div className="musicPicker__selected">
            <Cover src={draft.imageUrl} />
            <div className="musicPicker__selectedMeta">
              <strong>{draft.title}</strong>
              <span>{formatArtists(draft.artists)}</span>
            </div>
            <button type="button" className="musicPicker__textBtn" onClick={handleRemove}>
              {t("musicPicker.remove")}
            </button>
          </div>
        ) : null}

        <div className="musicPicker__list" role="list">
          {isSearching ? <p className="musicPicker__hint">{t("common.loading", { defaultValue: "..." })}</p> : null}
          {hint ? <p className="musicPicker__hint">{hint}</p> : null}
          {tracks.map((track) => {
            const isActive = draft?.id === track.id;
            return (
              <div
                key={track.id}
                className={`musicPicker__row ${isActive ? "musicPicker__row--active" : ""}`}
                role="listitem"
              >
                <Cover src={track.imageUrl} />
                <div className="musicPicker__rowMeta">
                  <strong>{track.title}</strong>
                  <span>
                    {formatArtists(track.artists) || t("musicPicker.noCover")}
                    {track.lengthSec ? ` · ${formatClipTime(track.lengthSec)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="musicPicker__iconBtn"
                  onClick={() => playPreview(track)}
                  aria-label={
                    playingId === track.id ? t("musicPicker.pause") : t("musicPicker.listen")
                  }
                >
                  {playingId === track.id ? "❚❚" : "▶"}
                </button>
                <button
                  type="button"
                  className="musicPicker__textBtn"
                  onClick={() => handleUseTrack(track)}
                >
                  {t("musicPicker.useTrack")}
                </button>
              </div>
            );
          })}
        </div>

        {draft?.id ? (
          <div className="musicPicker__controls">
            <label className="musicPicker__slider">
              <span>
                {t("musicPicker.start")}: {formatClipTime(draft.startSec)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, draft.lengthSec - 1)}
                step={0.5}
                value={draft.startSec}
                onChange={(event) => updateDraft({ startSec: Number(event.target.value) })}
              />
            </label>
            <label className="musicPicker__slider">
              <span>
                {t("musicPicker.end")}: {formatClipTime(draft.endSec)}
              </span>
              <input
                type="range"
                min={1}
                max={draft.lengthSec}
                step={0.5}
                value={draft.endSec}
                onChange={(event) => updateDraft({ endSec: Number(event.target.value) })}
              />
            </label>
            <label className="musicPicker__slider">
              <span>{t("musicPicker.musicVolume")}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.musicVolume}
                onChange={(event) => updateDraft({ musicVolume: Number(event.target.value) })}
              />
            </label>
            {showOriginalVolume ? (
              <label className="musicPicker__slider">
                <span>{t("musicPicker.originalVolume")}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.originalVolume}
                  onChange={(event) =>
                    updateDraft({ originalVolume: Number(event.target.value) })
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="musicPicker__actions">
          <button type="button" className="musicPicker__secondary" onClick={onClose}>
            {t("common.close", { defaultValue: "Close" })}
          </button>
          <button
            type="button"
            className="musicPicker__primary"
            onClick={handleDone}
            disabled={!draft?.id}
          >
            {t("musicPicker.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

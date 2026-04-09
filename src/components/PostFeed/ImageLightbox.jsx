import { useEffect, useRef } from "react";
import "./ImageLightbox.scss";

export default function ImageLightbox({
  isOpen,
  images = [],
  index = 0,
  onClose,
  onPrev,
  onNext,
}) {
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || !images.length) return null;
  const src = images[Math.min(Math.max(index, 0), images.length - 1)];

  const onTouchStart = (e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (endX == null) return;
    const diff = endX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) onPrev?.();
      else onNext?.();
    }
    touchStartX.current = null;
  };

  return (
    <div className="ilb" role="dialog" aria-modal="true" aria-label="Перегляд фото" onClick={onClose}>
      <button type="button" className="ilb__close" onClick={onClose} aria-label="Закрити">×</button>
      {images.length > 1 && (
        <button
          type="button"
          className="ilb__nav ilb__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            onPrev?.();
          }}
          aria-label="Попереднє фото"
        >
          ‹
        </button>
      )}
      <img
        src={src}
        alt=""
        className="ilb__img"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        draggable={false}
      />
      {images.length > 1 && (
        <button
          type="button"
          className="ilb__nav ilb__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            onNext?.();
          }}
          aria-label="Наступне фото"
        >
          ›
        </button>
      )}
      {images.length > 1 && (
        <div className="ilb__counter">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

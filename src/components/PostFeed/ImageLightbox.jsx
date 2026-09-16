import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import './ImageLightbox.scss';

export default function ImageLightbox({
  isOpen,
  images = [],
  index = 0,
  onClose,
  onPrev,
  onNext,
  indicator = 'counter',
  onEdit,
  onDelete,
  onSave,
  onMakeProfile,
}) {
  const { t } = useTranslation();
  const touchStart = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, onPrev, onNext]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !images.length) return null;
  const src = images[Math.min(Math.max(index, 0), images.length - 1)];

  const onTouchStart = (e) => {
    const touch = e.touches?.[0];
    touchStart.current = touch
      ? { x: touch.clientX, y: touch.clientY }
      : null;
  };

  const onTouchEnd = (e) => {
    const start = touchStart.current;
    const touch = e.changedTouches?.[0];
    touchStart.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
      if (Math.abs(deltaY) > 48 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0) onNext?.();
        else onPrev?.();
      }
      return;
    }

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) onPrev?.();
      else onNext?.();
    }
  };

  const actionItems = [
    onEdit && { id: 'edit', icon: profileIcons.pencilBlack, label: t('profile.photos.edit', { defaultValue: 'Редактировать' }), onClick: onEdit },
    onDelete && { id: 'delete', icon: profileIcons.storyDelete, label: t('profile.photos.delete', { defaultValue: 'Удалить' }), onClick: onDelete },
    onSave && { id: 'save', icon: profileIcons.saved, label: t('profile.photos.save', { defaultValue: 'Сохранить' }), onClick: onSave },
    onMakeProfile && { id: 'profile', icon: profileIcons.profileBlack, label: t('profile.photos.makeProfile', { defaultValue: 'Сделать фото профиля' }), onClick: onMakeProfile },
  ].filter(Boolean);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={[
        'ilb',
        indicator === 'dots' ? 'ilb--dots' : '',
        actionItems.length ? 'ilb--withActions' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={t('posts.lightbox.title')}
      onClick={onClose}
    >
      <button
        type="button"
        className="ilb__close"
        onClick={onClose}
        aria-label={t('posts.lightbox.close')}
      >
        ×
      </button>
      {images.length > 1 && (
        <button
          type="button"
          className="ilb__nav ilb__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            onPrev?.();
          }}
          aria-label={t('posts.lightbox.prev')}
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
          aria-label={t('posts.lightbox.next')}
        >
          ›
        </button>
      )}
      {images.length > 1 && indicator === 'dots' && (
        <div className="ilb__dots" onClick={(e) => e.stopPropagation()}>
          {images.map((_, i) => (
            <span
              key={i}
              className={['ilb__dot', i === index ? 'ilb__dot--active' : ''].filter(Boolean).join(' ')}
            />
          ))}
        </div>
      )}
      {images.length > 1 && indicator !== 'dots' && (
        <div className="ilb__counter">
          {index + 1} / {images.length}
        </div>
      )}
      {actionItems.length ? (
        <div className="ilb__actions" onClick={(event) => event.stopPropagation()}>
          {actionItems.map((action) => (
            <button key={action.id} type="button" onClick={action.onClick}>
              <img src={action.icon} alt="" aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

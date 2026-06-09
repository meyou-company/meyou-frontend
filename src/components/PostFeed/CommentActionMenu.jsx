import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './CommentActionMenu.scss';

export default function CommentActionMenu({ onEdit, onDelete }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menuAria = t('comments.menu.actionsAria');

  return (
    <div
      className="commentMenuWrap"
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="commentMenuBtn"
        aria-label={menuAria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="commentMenuDropdown" role="menu" aria-label={menuAria}>
          <button
            type="button"
            className="commentMenuItem"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit?.();
            }}
          >
            {t('comments.menu.edit')}
          </button>
          <button
            type="button"
            className="commentMenuItem commentMenuItem--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete?.();
            }}
          >
            {t('comments.menu.delete')}
          </button>
        </div>
      )}
    </div>
  );
}

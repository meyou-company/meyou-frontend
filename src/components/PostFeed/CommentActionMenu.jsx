import { useEffect, useRef, useState } from "react";
import "./CommentActionMenu.scss";

export default function CommentActionMenu({ onEdit, onDelete }) {
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
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className="commentMenuWrap"
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="commentMenuBtn"
        aria-label="Дії з коментарем"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="commentMenuDropdown" role="menu" aria-label="Дії з коментарем">
          <button
            type="button"
            className="commentMenuItem"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit?.();
            }}
          >
            Редагувати
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
            Видалити
          </button>
        </div>
      )}
    </div>
  );
}

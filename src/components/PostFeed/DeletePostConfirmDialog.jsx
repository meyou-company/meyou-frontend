import "./DeletePostConfirmDialog.scss";

export default function DeletePostConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  confirming = false,
  variant = "delete",
}) {
  if (!isOpen) return null;

  const isRepostRemove = variant === "repostRemove";
  const title = isRepostRemove
    ? "Прибрати допис зі стрічки?"
    : "Видалити цей допис?";
  const description = isRepostRemove
    ? "Оригінальний допис залишиться без змін."
    : "Цю дію не можна скасувати.";
  const confirmLabel = isRepostRemove
    ? confirming
      ? "Прибираємо…"
      : "Прибрати"
    : confirming
      ? "Видалення…"
      : "Видалити";

  return (
    <div
      className="deletePostDialogOverlay"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="deletePostDialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        aria-describedby="delete-post-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="delete-post-title" className="deletePostDialog__title">
          {title}
        </p>
        <p id="delete-post-desc" className="deletePostDialog__desc">
          {description}
        </p>
        <div className="deletePostDialog__actions">
          <button
            type="button"
            className="deletePostDialog__btn deletePostDialog__btn--cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            Скасувати
          </button>
          <button
            type="button"
            className="deletePostDialog__btn deletePostDialog__btn--confirm"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

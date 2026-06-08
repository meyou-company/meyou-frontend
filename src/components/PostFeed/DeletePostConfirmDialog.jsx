import { useTranslation } from 'react-i18next';
import './DeletePostConfirmDialog.scss';

export default function DeletePostConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  confirming = false,
  variant = 'delete',
  title: titleProp,
  description: descriptionProp,
  confirmLabel: confirmLabelProp,
  cancelLabel: cancelLabelProp,
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isRepostRemove = variant === 'repostRemove';
  const title =
    titleProp ??
    (isRepostRemove ? t('posts.deleteRepost.title') : t('posts.delete.title'));
  const description =
    descriptionProp ??
    (isRepostRemove
      ? t('posts.deleteRepost.description')
      : t('posts.delete.description'));
  const confirmLabel =
    confirmLabelProp ??
    (isRepostRemove
      ? confirming
        ? t('posts.deleteRepost.confirming')
        : t('posts.deleteRepost.confirm')
      : confirming
        ? t('posts.delete.confirming')
        : t('posts.delete.confirm'));
  const cancelLabel = cancelLabelProp ?? t('posts.delete.cancel');

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
            {cancelLabel}
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

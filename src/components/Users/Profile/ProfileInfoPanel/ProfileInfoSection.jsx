import { useTranslation } from 'react-i18next';
import profileIcons from '../../../../constants/profileIcons';

export default function ProfileInfoSection({
  title,
  icon,
  className = '',
  editable = false,
  canEdit = true,
  isEditing = false,
  isSaving = false,
  onEdit,
  onSave,
  onCancel,
  children,
  editContent,
}) {
  const { t } = useTranslation();

  return (
    <div className={`infoSection${isEditing ? ' infoSection--editing' : ''} ${className}`.trim()}>
      <div className="infoSection__header">
        <h3>
          <img src={icon} alt="" />
          {title}
        </h3>
        {editable && canEdit && !isEditing ? (
          <button
            type="button"
            className="infoSection__edit"
            onClick={onEdit}
            aria-label={t('profile.info.editSection')}
          >
            <img src={profileIcons.profileInfoPencil} alt="" />
          </button>
        ) : null}
      </div>

      {isEditing ? editContent : children}

      {isEditing ? (
        <div className="infoSection__actions">
          <button
            type="button"
            className="infoSection__cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="infoSection__save"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? t('profile.editForm.saving') : t('profile.info.save')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

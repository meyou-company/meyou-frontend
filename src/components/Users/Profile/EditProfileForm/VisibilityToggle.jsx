import { useTranslation } from 'react-i18next';
import './VisibilityToggle.scss';

export default function VisibilityToggle({
  checked,
  onChange,
  label,
  description,
  icon,
  className = '',
}) {
  const { t } = useTranslation();

  return (
    <div className={`visibility-toggle ${className}`}>
      <div className="visibility-toggle__content">
        <div className="visibility-toggle__labelRow">
          {icon && <span className="visibility-toggle__icon">{icon}</span>}

          <span className="visibility-toggle__label">
            {label || t('profile.editForm.visibility.title')}
          </span>
        </div>

        {description && <span className="visibility-toggle__description">{description}</span>}
      </div>

      <label className="visibility-toggle__control">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />

        <span className="visibility-toggle__switch" />
      </label>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import './VisibilityToggle.scss';

export default function VisibilityToggle({ checked, onChange, label }) {
  const { t } = useTranslation();

  return (
    <div className="visibility-toggle">
      <span>{label || t('profile.editForm.visibility.title')}</span>
      <label className="visibility-toggle__control">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />

        <span className="visibility-toggle__switch" />
      </label>
    </div>
  );
}

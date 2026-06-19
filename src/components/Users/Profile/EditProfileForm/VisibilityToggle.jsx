import { useTranslation } from 'react-i18next';
import './VisibilityToggle.scss';

export default function VisibilityToggle({ checked, onChange, label }) {
  const { t } = useTranslation();

  return (
    <label className="visibility-toggle">
      <span>{label || t('profile.editForm.visibility.title')}</span>

      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />

      <span className="visibility-toggle__switch" />
    </label>
  );
}

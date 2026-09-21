import { useTranslation } from 'react-i18next';
import { BRAND_LOGO_SRC, BRAND_NAME } from '../../constants/brand';

export default function BrandLogo({ className = '', alt, decorative = false }) {
  const { t } = useTranslation();
  const resolvedAlt = decorative
    ? ''
    : alt ?? t('auth.common.logoAlt', { defaultValue: BRAND_NAME });

  return (
    <img
      className={`app-brand-logo ${className}`.trim()}
      src={BRAND_LOGO_SRC}
      alt={resolvedAlt}
      draggable={false}
    />
  );
}

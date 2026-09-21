import { useTranslation } from 'react-i18next';
import { useForceDarkTheme } from '../../hooks/useForceDarkTheme';
import BrandLogo from '../BrandLogo/BrandLogo';
import './Login/LoginForm.scss';
import './AuthLoadingScreen.scss';

export default function AuthLoadingScreen({ messageKey = 'auth.google.loadingGeneric' }) {
  useForceDarkTheme();
  const { t } = useTranslation();

  return (
    <section className="auth auth--loading" aria-live="polite" aria-busy="true">
      <div className="auth__logoCard" aria-hidden="true">
        <BrandLogo className="auth__logoImg" decorative />
      </div>
      <p className="auth-loading__text">{t(messageKey)}</p>
    </section>
  );
}

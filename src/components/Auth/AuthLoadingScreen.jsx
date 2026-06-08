import { useTranslation } from 'react-i18next';
import { useForceDarkTheme } from '../../hooks/useForceDarkTheme';
import './AuthLoadingScreen.scss';

export default function AuthLoadingScreen({ messageKey = 'auth.google.loadingGeneric' }) {
  useForceDarkTheme();
  const { t } = useTranslation();

  return (
    <section className="auth auth--loading" aria-live="polite" aria-busy="true">
      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt="" />
      </div>
      <p className="auth-loading__text">{t(messageKey)}</p>
    </section>
  );
}

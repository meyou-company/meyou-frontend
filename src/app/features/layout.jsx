import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForceDarkTheme } from '../../hooks/useForceDarkTheme';
import { getFeatureNav, getFeatureUi } from '../../i18n/features';
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher';
import './features.scss';

export default function FeatureLayout({ children }) {
  useForceDarkTheme();
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language;
  const nav = getFeatureNav(language);
  const ui = getFeatureUi(language);

  return (
    <div className="featureLayout">
      <div className="featureLayout__inner">
        <header className="featureLayout__header">
          <p className="featureLayout__brand">{ui.brand}</p>
          <div className="featureLayout__headerActions">
            <LanguageSwitcher />
            <button
              type="button"
              className="featureLayout__homeLink"
              onClick={() => navigate('/')}
            >
              {ui.backHome}
            </button>
          </div>
        </header>

        <nav className="featureLayout__nav" aria-label={ui.exploreMore}>
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`featureLayout__navLink${isActive ? ' featureLayout__navLink--active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="featureLayout__main">{children}</main>
      </div>
    </div>
  );
}

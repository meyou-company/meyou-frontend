import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLegalNav, getLegalUi } from '../../i18n/legal';
import './legal.scss';

export default function LegalLayout({ children }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const nav = getLegalNav(i18n.language);
  const ui = getLegalUi(i18n.language);

  return (
    <div className="legalLayout">
      <div className="legalLayout__inner">
        <header className="legalLayout__header">
          <h1 className="legalLayout__brand">{ui.brand}</h1>
          <button
            type="button"
            className="legalLayout__homeLink"
            onClick={() => navigate('/')}
          >
            {ui.backHome}
          </button>
        </header>

        <nav className="legalLayout__nav" aria-label="Legal documents">
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`legalLayout__navLink${isActive ? ' legalLayout__navLink--active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="legalLayout__main">{children}</main>
      </div>
    </div>
  );
}

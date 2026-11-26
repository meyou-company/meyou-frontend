import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandWordmark from '../../components/BrandLogo/BrandWordmark';
import { BRAND_NAME } from '../../constants/brand';
import './AboutPage.scss';

const SECTION_IDS = [
  'what',
  'mission',
  'social',
  'posts',
  'stories',
  'chats',
  'calls',
  'live',
  'luna',
  'community',
  'privacy',
];

export default function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="aboutPage">
      <div className="aboutPage__inner">
        <header className="aboutPage__header">
          <BrandWordmark className="aboutPage__brand" as="p" />
          <button type="button" className="aboutPage__homeLink" onClick={() => navigate('/')}>
            {t('about.backHome')}
          </button>
        </header>

        <article className="aboutPage__article">
          <header className="aboutPage__hero">
            <h1>{t('about.title', { brand: BRAND_NAME })}</h1>
            <p className="aboutPage__subtitle">{t('about.subtitle', { brand: BRAND_NAME })}</p>
          </header>

          <section className="aboutPage__sections" aria-label={t('about.sectionsAria')}>
            {SECTION_IDS.map((id) => (
              <details key={id} className="aboutPage__section" open={id === 'what' ? true : undefined}>
                <summary className="aboutPage__sectionTitle">{t(`about.sections.${id}.title`)}</summary>
                <p className="aboutPage__sectionBody">{t(`about.sections.${id}.body`)}</p>
              </details>
            ))}
          </section>

          <footer className="aboutPage__legal">
            <h2>{t('about.legalTitle')}</h2>
            <ul>
              <li>
                <Link to="/legal/terms">{t('about.legal.terms')}</Link>
              </li>
              <li>
                <Link to="/legal/privacy">{t('about.legal.privacy')}</Link>
              </li>
              <li>
                <Link to="/legal/community-guidelines">{t('about.legal.guidelines')}</Link>
              </li>
            </ul>
          </footer>
        </article>
      </div>
    </div>
  );
}
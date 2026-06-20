import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./HomeFeed.scss";
import { useForceDarkTheme } from "../../hooks/useForceDarkTheme";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";

function Feature({ icon, title, to }) {
  return (
    <Link className="feature" to={to}>
      <span
        className="feature__icon"
        style={{ "--icon-url": `url(${icon})` }}
        aria-hidden="true"
      />
      <span className="feature__text">{title}</span>
    </Link>
  );
}

export default function HomeFeed({ onRegister, onLogin }) {
  useForceDarkTheme();
  const { t } = useTranslation();

  return (
    <section className="home auth">
      <div className="home__langSwitcher">
        <LanguageSwitcher />
      </div>
      <div className="home__logoSection">
        <div className="home__logoCard">
          <img
            className="home__logoImg"
            src="/Logo/photo.png"
            alt={t("auth.common.logoAlt")}
          />
        </div>
        <p className="home__tagline">{t("landing.tagline")}</p>
      </div>

      <div className="home__featuresSection">
        <div className="home__features">
          <Feature
            icon="/icon1/1.png"
            title={t("landing.features.earn")}
            to="/earn"
          />
          <Feature
            icon="/icon1/2.png"
            title={t("landing.features.chat")}
            to="/features/chat"
          />
          <Feature
            icon="/icon1/3.png"
            title={t("landing.features.security")}
            to="/features/security"
          />
        </div>
      </div>

      <div className="home__actionsSection">
        <div className="home__actions">
          <button
            type="button"
            className="btn-gradient home__btn"
            onClick={onRegister}
          >
            {t("auth.register.submit")}
          </button>

          <button
            type="button"
            className="btn-gradient home__btn"
            onClick={onLogin}
          >
            {t("auth.login.submit")}
          </button>
        </div>
      </div>
    </section>
  );
}

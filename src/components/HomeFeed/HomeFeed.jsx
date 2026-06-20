import { Link } from "react-router-dom";
import "./HomeFeed.scss";
import { useForceDarkTheme } from "../../hooks/useForceDarkTheme";

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

  return (
    <section className="home auth">
      <div className="home__logoSection">
        <div className="home__logoCard">
          <img
            className="home__logoImg"
            src="/Logo/photo.png"
            alt="Me You logo"
          />
        </div>
      </div>

      <div className="home__featuresSection">
        <div className="home__features">
          <Feature
            icon="/icon1/1.png"
            title="Бонуси за друзів"
            to="/earn"
          />
          <Feature
            icon="/icon1/2.png"
            title="Сучасний чат"
            to="/features/chat"
          />
          <Feature
            icon="/icon1/3.png"
            title="Повна безпека"
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
            Создать аккаунт
          </button>

          <button
            type="button"
            className="btn-gradient home__btn"
            onClick={onLogin}
          >
            Войти
          </button>
        </div>
      </div>
    </section>
  );
}

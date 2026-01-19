import "./HomeFeed.scss";
import { useForceDarkTheme } from "../../hooks/useForceDarkTheme";
function Feature({ icon, title, onClick }) {
  
  return (
    <button className="feature" onClick={onClick} type="button">
      <span
        className="feature__icon"
        style={{ "--icon-url": `url(${icon})` }}
        aria-hidden="true"
      />
      <span className="feature__text">{title}</span>
    </button>
  );
}

export default function HomeFeed({ onRegister, onLogin }) {
   useForceDarkTheme();
  return (
    <section className="home auth">
      {/* LOGO */}
      <div className="home__logoSection">
        <div className="home__logoCard">
          <img
            className="home__logoImg"
            src="/Logo/photo.png"
            alt="Me You logo"
          />
        </div>
      </div>

      {/* FEATURES */}
      <div className="home__featuresSection">
        <div className="home__features">
          <Feature
            icon="/icon1/1.png"
            title="Бонусы за друзей"
            onClick={onRegister}
          />
          <Feature
            icon="/icon1/2.png"
            title="Современный чат"
            onClick={onLogin}
          />
          <Feature
            icon="/icon1/3.png"
            title="Полная безопасность"
            onClick={onLogin}
          />
        </div>
      </div>

      {/* ACTIONS */}
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

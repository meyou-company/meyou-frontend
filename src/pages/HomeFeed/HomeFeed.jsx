import { useNavigate } from "react-router-dom";
import "./HomeFeed.scss";

export default function HomeFeed() {
  const navigate = useNavigate();

  return (
    <section className="home">
      {/* ✅ Background bubbles (decor) */}
      <img
        className="home__bubbles home__bubbles--tl"
        src="/icon1/image0.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="home__bubbles home__bubbles--br"
        src="/icon1/image0.png"
        alt=""
        aria-hidden="true"
      />

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
            onClick={() => navigate("/register")}
          />
          <Feature
            icon="/icon1/2.png"
            title="Современный чат"
            onClick={() => navigate("/login")}
          />
          <Feature
            icon="/icon1/3.png"
            title="Полная безопасность"
            onClick={() => navigate("/login")}
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="home__actionsSection">
        <div className="home__actions">
          <button
            type="button"
            className="btn-gradient home__btn"
            onClick={() => navigate("/register")}
          >
            Создать аккаунт
          </button>

          <button
            type="button"
            className="btn-gradient home__btn"
            onClick={() => navigate("/login")}
          >
            Войти
          </button>
        </div>
      </div>
    </section>
  );
}
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



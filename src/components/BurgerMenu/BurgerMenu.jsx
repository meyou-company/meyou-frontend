import "./BurgerMenu.scss";

export default function BurgerMenu({ isOpen, onClose }) {
  return (
    <div className={`profile-menu ${isOpen ? "profile-menu--open" : ""}`}>
      <div className="profile-menu__header">
        <div className="profile-menu__user">
          <div className="profile-menu__avatar-wrapper">
            <img className="profile-menu__avatar" src="/avatar.png" alt="" />
            <span className="profile-menu__status-dot" />
          </div>

          <div className="profile-menu__info">
            <div className="profile-menu__name">Марина Хельмут.</div>
            <div className="profile-menu__email">
              marinaart222@gmail.com
            </div>
          </div>
        </div>

        <button className="profile-menu__close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="profile-menu__divider" />

      <nav className="profile-menu__list">
        <button className="profile-menu__item">
          <span className="profile-menu__icon">👤</span>
          <span className="profile-menu__label">Мой профиль</span>
        </button>

        <button className="profile-menu__item profile-menu__item--logout">
          <span className="profile-menu__icon">⏻</span>
          <span className="profile-menu__label">Выйти</span>
        </button>
      </nav>
    </div>
  );
}
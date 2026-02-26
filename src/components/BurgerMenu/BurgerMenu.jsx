import { useAuthStore } from "../../zustand/useAuthStore";
import { useNavigate } from "react-router-dom";
import ThemeToggleDark from "../ThemeToggleDark/ThemeToggleDark";
import { MENU_ITEMS, LANGUAGE_ITEM, LOGOUT_ITEM, CLOSE_ITEM } from "../../constants/burgerMenuItems";
import "./BurgerMenu.scss";
import profileIcons from "../../constants/profileIcons";

export default function BurgerMenu({ isOpen, onClose, onItemClick, toggleTheme }) {
   const { logout } = useAuthStore();
  const navigate = useNavigate();

   const handleItemClick = async (id) => {
    if (id === "logout") {
      try {
        await logout();
        navigate("/auth/login", { replace: true });
      } catch (error) {
        console.error("Logout error:", error);
      }
    } 
     if (id === "dark") {
      toggleTheme(); 
    } 
    else {
      onItemClick?.(id);
    }
    onClose();
  };

  return (
    <div className={`profile-menu ${isOpen ? "profile-menu--open" : ""}`}>
 
      <div className="profile-menu__header">
        <div className="profile-menu__user">
          <div className="profile-menu__avatar-wrapper">
            <img className="profile-menu__avatar" src={profileIcons.user} alt="" />
            <span className="profile-menu__status-dot" />
          </div>

          <div className="profile-menu__info">
            <div className="profile-menu__name">Марина Хельмут.</div>
            <a href="mailto:marinaart222@gmail.com" className="profile-menu__email">
              marinaart222@gmail.com
            </a>
          </div>
        </div>

        <button onClick={onClose} className="profile-menu__close">
          <img src={CLOSE_ITEM.icon} alt=""  className="profile-menu__close--icon "/>
        </button>
      </div>

      <div className="profile-menu__divider" />

        <nav className="profile-menu__list">
        {MENU_ITEMS.map((item) => {
          // "Посмотреть как гость" 
          if (item.id === "guest") {
            return (
              <button key={item.id} className="profile-menu__item" onClick={() => handleItemClick(item.id)}>
                <img src={item.icon} alt="" className="profile-menu__icon" />
                <span className="profile-menu__label">{item.label}</span>
                <div className="profile-menu__guest-toggle">
                  <div className="profile-menu__toggle-track">
                    <div className="profile-menu__toggle-thumb" />
                  </div>
                </div>
              </button>
            );
          }

          // "Темная тема" — с ThemeToggleDark
          if (item.id === "dark") {
            return (
              <button key={item.id} className="profile-menu__item--dark" onClick={() => handleItemClick(item.id)}>
                <ThemeToggleDark className="profile-menu__theme-toggle--hidden-icon" />
                <img src={item.icon} alt="" className="profile-menu__icon profile-menu__icon--toggle" />
                <span className="profile-menu__label">{item.label}</span>

              </button>
            );
          }


          // остальные пункты как обычно
          return (
            <button
              key={item.id}
              className={`profile-menu__item ${item.type === "toggle" ? "profile-menu__item--toggle" : ""}`}
              onClick={() => handleItemClick(item.id)}
            >
              <img src={item.icon} alt="" className="profile-menu__icon" />
              <span className="profile-menu__label">{item.label}</span>
            </button>
          );
        })}
        

        {/* язык */}
          <button
            className="profile-menu__item profile-menu__item--language"
            onClick={() => handleItemClick("language")}
          >
            <span className="profile-menu__label">{LANGUAGE_ITEM.label}</span>
            <img src={LANGUAGE_ITEM.icon} alt="" className="profile-menu__icon profile-menu__icon--language" />
          </button>

        {/* выход */}
        <div className="profile-menu__section">
          <button
            className="profile-menu__item profile-menu__item--logout"
            onClick={() => handleItemClick("logout")}
          >
            <img src={LOGOUT_ITEM.icon} alt="" className="profile-menu__icon " />
            <span className="profile-menu__label">{LOGOUT_ITEM.label}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}


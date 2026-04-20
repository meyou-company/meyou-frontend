import { useAuthStore } from "../../zustand/useAuthStore";
import { useNavigate } from "react-router-dom";
import ThemeToggleDark from "../ThemeToggleDark/ThemeToggleDark";
import { MENU_ITEMS, LANGUAGE_ITEM, LOGOUT_ITEM, CLOSE_ITEM } from "../../constants/burgerMenuItems";
import "./BurgerMenu.scss";
import profileIcons from "../../constants/profileIcons";
import { useMemo, useRef } from "react";


export default function BurgerMenu({ isOpen, onClose, onItemClick, toggleTheme }) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const toggleRef = useRef(null);

  const avatarUrl = user?.avatarUrl || user?.avatar || null;

  const email = user?.email || "";

  const displayName = useMemo(() => {
    return (
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "User"
    );
  }, [user]);

  const handleItemClick = async (id) => {

    if (id === "logout") {
   try {
    await logout();

    localStorage.clear();
    sessionStorage.clear();

    document.cookie.split(";").forEach((cookie) => {
       document.cookie = cookie
         .replace(/^ +/, "")
         .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
     });
 
     navigate("/auth/login", { replace: true });
   } catch (error) {
     console.error("Logout error:", error);
   }
 
   onClose();
   return;
 }

    if (id === "profile") {
    navigate("/profile");
    onClose();
    return;
  }

    if (id === "security") {
    navigate("/auth/forgot-password");
    onClose();
    return;
  }

    if (id === "edit") {
      navigate("/users/profile/edit");
      onClose();
      return;
    }

    if (id === "dark") {
      toggleTheme();
    } else {
      onItemClick?.(id);
    }
    onClose();
  };

  const handleDarkClick = () => {
  const button = toggleRef.current?.querySelector("button");

  if (button) {
    button.click();
  }
};

  if (!isOpen) return null;

  return (
    <div className="profile-menu-wrap" aria-hidden="false">
      <div
        className="profile-menu__backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Закрити меню"
      />
      <div className={`profile-menu ${isOpen ? "profile-menu--open" : ""}`}>
    <div className="profile-menu__header">
      <div className="profile-menu__user">
        <button
          type="button"
          className="profile-menu__userTap"
          onClick={() => {
            navigate("/profile");
            onClose();
          }}
          aria-label="Мій профіль"
        >
          <div className="profile-menu__avatar-wrapper">
            <img
              className="profile-menu__avatar"
              src={avatarUrl || profileIcons.user}
              alt=""
              aria-hidden="true"
            />
            <span className="profile-menu__status-dot" />
          </div>

          <div className="profile-menu__infoWrapper">
            <span className="profile-menu__name">{displayName}</span>
          {email ? (
          <a href={`mailto:${email}`} className="profile-menu__email profile-menu__email--belowTap">
            {email}
          </a>
        ) : null}
          </div>

          
        </button>

      </div>

  <button onClick={onClose} className="profile-menu__close">
    <img src={CLOSE_ITEM.icon} alt="Close menu" className="profile-menu__close--icon" />
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
            <div key={item.id}
            className="profile-menu__item profile-menu__item--dark"
            onClick={handleDarkClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleDarkClick()}
          >
            
            <img src={item.icon} alt="" className="profile-menu__icon profile-menu__icon--toggle"/>
            <span className="profile-menu__label">{item.label}</span>

            <div ref={toggleRef}>
              <ThemeToggleDark className="profile-menu__theme-toggle" />
            </div>
          </div>
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
    </div>
  );
}


import { useLocation, matchPath } from "react-router-dom";
import ThemeToggleDark from "../../../ThemeToggleDark/ThemeToggleDark";

import profileIcons from "../../../../constants/profileIcons";
import {
  desktopNavItems,
  HEADER_CONFIG,
} from "../../../../constants/profileNavigation";
import { useBurgerMenu } from "../../../../hooks/useBurgerMenu";

import "./ProfileHeader.scss";

const makeIsActive = (location) => (path, end = false) =>
  !!matchPath({ path: path || "", end }, location.pathname);

const LEFT_BUTTON_ICONS = {
  home: profileIcons.home,
  search: profileIcons.search,
};

const DEFAULT_AVATAR = "/Logo/photo.png";

export default function ProfileHeader({
  variant = "owner",
  /** Маленьке фото поточного юзера для мобільного хедера; клік веде на його профіль */
  currentUserAvatar,
  onSearch,
  onGoHome,
  onGoToMyProfile,
  onMessagesTop,
  onWallet,
  onNav,
}) {
  const location = useLocation();
  const { toggle } = useBurgerMenu();
  const isActive = makeIsActive(location);

  const config = HEADER_CONFIG[variant] ?? HEADER_CONFIG.owner;
  const leftButtons = config.leftButtons ?? ["search"];
  const desktopTop = config.desktopTop ?? [];
  const showThemeInRight = config.showThemeInRight === true;
  const showDesktopNav = config.showDesktopNav !== false;
  const navItems = config.desktopNav ?? desktopNavItems;
  const isVisitor = variant !== "owner";

  return (
    <header className={`profile-header ${isVisitor ? "profile-header--visitor" : ""}`}>
      <div className="topRow">
        {/* Left: desktop — Home+Search для visitor, тільки Search для owner; на мобілці у visitor домика немає */}
        <div className="leftGroup" aria-label="Desktop left actions">
          {leftButtons.map((key) => (
            <button
              key={key}
              type="button"
              className="searchBtn"
              data-button={key}
              onClick={key === "home" ? () => onNav("/first-page") : onSearch}
              aria-label={key === "home" ? "Home" : "Search"}
            >
              <img src={LEFT_BUTTON_ICONS[key]} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Center: Logo — на чужих профілях клік веде на мій профіль */}
        <button
          type="button"
          className="logo"
          onClick={variant === "owner" ? onGoHome : (onGoToMyProfile ?? onGoHome)}
          aria-label="Go home"
        >
          <span className="logoText">ME YOU</span>
        </button>

        {/* 📱 MOBILE top right */}
        <div className="mobileRightGroup" aria-label="Mobile actions">
          <button type="button" className="iconBtn" onClick={onMessagesTop} aria-label="Messages">
            <img src={profileIcons.chat} alt="" aria-hidden="true" />
          </button>
        </div>

        {/* 🖥 DESKTOP top right: owner = Wallet + Theme + Burger (Theme і Burger поміняні місцями); friend = тільки Burger */}
        <div className="rightGroup" aria-label="Desktop actions">
          {desktopTop.map((item) => {
            const active = item.path ? isActive(item.path, false) : false;
            const onClick = () => {
              if (item.action === "MENU") return toggle();
              if (item.key === "balance" && onWallet) return onWallet();
              if (item.path) return onNav(item.path);
            };
            const isMenu = item.action === "MENU";
            return (
              <span key={item.key} style={{ display: "contents" }}>
                {isMenu && showThemeInRight && <ThemeToggleDark className="themeBtn" />}
                <button
                  type="button"
                  className={`iconBtn ${active ? "iconBtnActive" : ""}`}
                  onClick={onClick}
                  aria-label={item.label}
                >
                  <img src={item.icon} alt="" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* 🖥 DESKTOP second row (5 іконок) — тільки для owner; для чужих профілів приховано */}
      {showDesktopNav && (
        <nav className="desktopNavRow" aria-label="Desktop navigation">
          {navItems.map((item) => {
            const active = isActive(item.path, false);
            return (
              <button
                key={item.key}
                type="button"
                className={`desktopNavBtn ${active ? "desktopNavBtnActive" : ""}`}
                onClick={() => item.path && onNav(item.path)}
                aria-label={item.label}
              >
                <img src={item.icon} alt="" aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      )}

      {/* 📱 Нижній навбар — глобальний AppBottomNav на всіх сторінках */}
    </header>
  );
}

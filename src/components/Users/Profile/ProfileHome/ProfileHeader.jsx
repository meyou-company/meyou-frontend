import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggleDark from "../../../ThemeToggleDark/ThemeToggleDark";

import profileIcons from "../../../../constants/profileIcons";
import { mobileProfileNav, desktopNavItems } from "../../../../constants/profileNavigation";
import { useBurgerMenu } from "../../../../hooks/useBurgerMenu";

import "./ProfileHeader.scss";

export default function ProfileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle } = useBurgerMenu();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="profile-header">
      <div className="topRow">
        {/* Left: Search */}
        <button
          type="button"
          className="searchBtn"
          onClick={() => navigate("/search")}
          aria-label="Search"
        >
          <img src={profileIcons.search} alt="" aria-hidden="true" />
        </button>

        {/* Center: Logo */}
        <button
          type="button"
          className="logo"
          onClick={() => navigate("/")}
          aria-label="Go home"
        >
          <span className="logoText">ME YOU</span>
        </button>

        {/* 📱 MOBILE top right: Chat — Theme — Wallet */}
        <div className="mobileRightGroup" aria-label="Mobile actions">
          <button
            type="button"
            className="iconBtn"
            onClick={() => navigate("/messages")}
            aria-label="Messages"
          >
            <img src={profileIcons.chat} alt="" aria-hidden="true" />
          </button>

        </div>

        {/* 🖥 DESKTOP top right: Wallet — Theme — Burger */}
        <div className="rightGroup" aria-label="Desktop actions">
          <button
            type="button"
            className="iconBtn"
            onClick={() => navigate("/wallet")}
            aria-label="Wallet"
          >
            <img src={profileIcons.balance} alt="" aria-hidden="true" />
          </button>

          <ThemeToggleDark className="themeBtn" />

          <button
            type="button"
            className="iconBtn"
            onClick={toggle}
            aria-label="Menu"
          >
            <img src={profileIcons.menu} alt="" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 🖥 DESKTOP second row */}
      <nav className="desktopNavRow" aria-label="Desktop navigation">
        {desktopNavItems.map((item) => {
          const active = isActive(item.path);

          return (
            <button
              key={item.key}
              type="button"
              className={`desktopNavBtn ${active ? "desktopNavBtnActive" : ""}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      {/* 📱 MOBILE bottom */}
      <nav className="mobileNavRow" aria-label="Mobile navigation">
        {mobileProfileNav.map((item) => {
          const active = item.path ? isActive(item.path) : false;

          return (
            <button
              key={item.key}
              type="button"
              className={`navBtn ${active ? "navBtnActive" : ""}`}
              onClick={() => {
                if (item.action === "MENU") return toggle();
                if (item.path) navigate(item.path);
              }}
              aria-label={item.label}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </header>
  );
}

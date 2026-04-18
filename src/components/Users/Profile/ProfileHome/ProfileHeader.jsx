import { useLocation, matchPath } from 'react-router-dom';
import ThemeToggleDark from '../../../ThemeToggleDark/ThemeToggleDark';
import { useState } from 'react';

import profileIcons from '../../../../constants/profileIcons';
import { HEADER_CONFIG } from '../../../../constants/profileNavigation';
import { useBurgerMenu } from '../../../../hooks/useBurgerMenu';

import './ProfileHeader.scss';
import { notificationsMock } from '../../../Notifications/notificationsMock';

const data = notificationsMock;
const unreadCount = data.filter((n) => !n.isRead).length;
const makeIsActive =
  (location) =>
  (path, end = false) =>
    !!matchPath({ path: path || '', end }, location.pathname);

export default function ProfileHeader({
  variant = 'owner',
  onSearch,
  onGoHome,
  onGoToMyProfile,
  onMessagesTop,
  onWallet,
  onNav,
}) {
  const location = useLocation();
  const { toggle } = useBurgerMenu();
  const [searchValue, setSearchValue] = useState('');
  const isActive = makeIsActive(location);

  const config = HEADER_CONFIG[variant] ?? HEADER_CONFIG.owner;
  const showThemeInRight = config.showThemeInRight === true;
  const isVisitor = variant !== 'owner';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchValue.trim());
  };

  const handleSearchOpen = () => {
    onSearch?.(searchValue.trim());
  };

  return (
    <header className={`profile-header ${isVisitor ? 'profile-header--visitor' : ''}`}>
      <div className="topRow">
        <div className="leftGroup" aria-label="Desktop left actions">
          <button
            type="button"
            className="iconBtn iconBtnHome iconBtnHomeDesktop"
            data-button="home"
            onClick={() => onNav?.('/first-page')}
            aria-label="Home"
          >
            <img src={profileIcons.home} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="iconBtn iconBtnSearchMobile"
            onClick={handleSearchOpen}
            aria-label="Пошук"
          >
            <img src={profileIcons.search} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="logo"
            onClick={variant === 'owner' ? onGoHome : (onGoToMyProfile ?? onGoHome)}
            aria-label="Go home"
          >
            <span className="logoText app-brand-wordmark">ME YOU</span>
          </button>
        </div>

        <form className="searchForm" onSubmit={handleSearchSubmit} onClick={handleSearchOpen}>
          <img
            src={profileIcons.search}
            alt=""
            aria-hidden="true"
            className="searchIcon"
            onClick={handleSearchOpen}
          />
          <input
            type="text"
            className="searchInput"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={handleSearchOpen}
            placeholder="Пошук"
            aria-label="Пошук"
          />
        </form>

        <div className="mobileRightGroup" aria-label="Mobile actions">
          <button type="button" className="iconBtn" onClick={onMessagesTop} aria-label="Messages">
            <img src={profileIcons.chat} alt="" aria-hidden="true" />
          </button>
        </div>

        <div className="rightGroup" aria-label="Desktop actions">
          <button
            type="button"
            className={`iconBtn ${isActive('/notifications', false) ? 'iconBtnActive' : ''}`}
            onClick={() => onNav?.('/notifications')}
            aria-label="Сповіщення"
          >
            <div className="iconWrapper">
              <img src={profileIcons.notifications} alt="" aria-hidden="true" />

              {unreadCount > 0 && (
                <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </div>
          </button>

          <button
            type="button"
            className={`iconBtn ${isActive('/wallet', false) ? 'iconBtnActive' : ''}`}
            onClick={onWallet}
            aria-label="Баланс"
          >
            <img src={profileIcons.balance} alt="" aria-hidden="true" />
          </button>

          {showThemeInRight && <ThemeToggleDark className="themeBtn" />}

          <button type="button" className="iconBtn" onClick={toggle} aria-label="Меню">
            <img src={profileIcons.menu} alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

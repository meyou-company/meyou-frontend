import { useLocation, matchPath } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ThemeToggleDark from '../../../ThemeToggleDark/ThemeToggleDark';
import profileIcons from '../../../../constants/profileIcons';
import { HEADER_CONFIG } from '../../../../constants/profileNavigation';
import { useBurgerMenu } from '../../../../hooks/useBurgerMenu';
import MessagesNavBadge from '../../../Messages/MessagesNavBadge';
import NotificationBell from '../../../Notifications/NotificationBell';

import './ProfileHeader.scss';

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
  const { t } = useTranslation();
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

  const handleNotificationsClick = () => {
    onNav?.('/notifications');
  };

  return (
    <header className={`profile-header ${isVisitor ? 'profile-header--visitor' : ''}`}>
      <div className="topRow">
        <div className="leftGroup" aria-label={t('navigation.home')}>
          <button
            type="button"
            className="iconBtn iconBtnHome iconBtnHomeDesktop"
            data-button="home"
            onClick={() => onNav?.('/first-page')}
            aria-label={t('navigation.home')}
          >
            <img src={profileIcons.home} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="iconBtn iconBtnSearchMobile"
            onClick={handleSearchOpen}
            aria-label={t('navigation.search')}
          >
            <img src={profileIcons.search} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="logo"
            onClick={variant === 'owner' ? onGoHome : (onGoToMyProfile ?? onGoHome)}
            aria-label={t('navigation.home')}
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
            placeholder={t('explore.searchPlaceholder')}
            aria-label={t('explore.searchAria')}
          />
        </form>

        <div className="mobileRightGroup" aria-label={t('navigation.messages')}>
          <button
            type="button"
            className="iconBtn iconBtn--messages"
            onClick={onMessagesTop}
            aria-label={t('navigation.messages')}
          >
            <span className="iconBtn__iconWrap">
              <img src={profileIcons.chat} alt="" aria-hidden="true" />
              <MessagesNavBadge />
            </span>
          </button>
        </div>

        <div className="rightGroup" aria-label={t('navigation.menu')}>
          <NotificationBell onGoNotifications={handleNotificationsClick} />

          <button
            type="button"
            className={`iconBtn ${isActive('/wallet', false) ? 'iconBtnActive' : ''}`}
            onClick={onWallet}
            aria-label={t('navigation.wallet')}
          >
            <img src={profileIcons.balance} alt="" aria-hidden="true" />
          </button>

          <ThemeToggleDark className="themeBtn" />

          <button type="button" className="iconBtn" onClick={toggle} aria-label={t('navigation.menu')}>
            <img src={profileIcons.menu} alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

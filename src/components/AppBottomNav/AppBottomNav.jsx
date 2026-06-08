import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useBurgerMenu } from '../../hooks/useBurgerMenu';
import { useAuthStore } from '../../zustand/useAuthStore';
import NotificationBell from '../../components/Notifications/NotificationBell';
import { useMobileProfileNav } from '../../hooks/useMobileProfileNav';
import { useTranslation } from 'react-i18next';
import './AppBottomNav.scss';

const DEFAULT_AVATAR = '/Logo/photo.png';

const makeIsActive =
  (location) =>
  (path, end = false) =>
    !!matchPath({ path: path || '', end }, location.pathname);

export default function AppBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggle } = useBurgerMenu();
  const mobileProfileNav = useMobileProfileNav();

  const user = useAuthStore((s) => s.user);
  const currentUserAvatar = user?.avatarUrl || user?.avatar || DEFAULT_AVATAR;

  const isActive = makeIsActive(location);

  const withAvatar = [
    ...mobileProfileNav.slice(0, 2),
    { key: 'avatar', type: 'avatar', label: t('navigation.myProfile') },
    ...mobileProfileNav.slice(2),
  ];

  return (
    <nav className="app-bottom-nav" aria-label={t('navigation.bottomNav')}>
      {withAvatar.map((item) => {
        const isHome = item.key === 'home';
        const isAvatar = item.type === 'avatar';

        const active = isHome
          ? isActive('/first-page', false)
          : isAvatar
            ? isActive('/profile', true)
            : item.key === 'user'
              ? isActive('/friends', false)
              : item.path
                ? isActive(item.path, false)
                : false;

        const onClick = () => {
          if (item.action === 'MENU') return toggle();

          if (item.key === 'notifications') {
            return navigate('/notifications');
          }

          if (isHome) return navigate('/first-page');
          if (isAvatar) return navigate('/profile');
          if (item.key === 'user') return navigate('/friends');
          if (item.path) navigate(item.path);
        };

        if (item.key === 'notifications') {
          return <NotificationBell key={item.key} onGoNotifications={onClick} />;
        }

        const ariaLabel =
          item.key === 'user' ? t('navigation.friends') : item.label;

        return (
          <button
            key={item.key}
            type="button"
            className={`app-bottom-nav__btn ${isAvatar ? 'app-bottom-nav__btn--avatar' : ''} ${active ? 'app-bottom-nav__btn--active' : ''}`}
            onClick={onClick}
            aria-label={ariaLabel}
          >
            <div className="app-bottom-nav__iconWrapper">
              {isAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt=""
                  aria-hidden="true"
                  className="app-bottom-nav__avatarImg"
                />
              ) : (
                <img src={item.icon} alt="" aria-hidden="true" />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

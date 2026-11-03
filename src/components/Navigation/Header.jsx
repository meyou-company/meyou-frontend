import { NavLink } from 'react-router-dom';
import { profileIcons, useNavItems } from '../../hooks/useNavItems';
import MessagesNavBadge from '../Messages/MessagesNavBadge.jsx';
import './Header.scss';

export default function Header({ alwaysVisible = false }) {
  const navItems = useNavItems();

  return (
    <nav
      className={`header ${alwaysVisible ? 'header--always-visible' : ''}`}
      aria-label="Основна навігація"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) => `header__navItem ${isActive ? 'active' : ''}`}
        >
          <span className="header__navIconWrap">
            <img src={profileIcons[item.icon]} className="header__icon" alt="" />
            {item.key === 'messages' && <MessagesNavBadge />}
          </span>

          <span className="header__title">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { useNavigate } from "react-router-dom";
import { useNavItems } from "../../hooks/useNavItems";
import { useBurgerMenu } from "../../hooks/useBurgerMenu";
import profileIcons from "../../constants/profileIcons";
import MessagesNavBadge from "../Messages/MessagesNavBadge";

export default function LiveHeader() {
  const navigate = useNavigate();
  const navItems = useNavItems();
  const { open } = useBurgerMenu();

  const desktopItems = navItems.map((item) =>
    item.key === "video"
      ? {
          ...item,
          key: "live",
          label: "Прямой эфир",
          icon: "liveNav",
          path: "/live",
        }
      : item.key === "messages"
        ? { ...item, icon: "comments" }
        : item,
  );

  return (
    <>
      <header className="liveHeader liveHeader--desktop">
        <nav className="liveHeader__nav" aria-label="Основная навигация">
          {desktopItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`liveHeader__navItem ${item.key === "live" ? "liveHeader__navItem--active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="liveHeader__navIcon">
                <img src={profileIcons[item.icon]} alt="" />
                {item.key === "messages" && <MessagesNavBadge />}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <header className="liveHeader liveHeader--compact">
        <button
          type="button"
          className="liveHeader__compactButton liveHeader__compactButton--home"
          onClick={() => navigate("/first-page")}
          aria-label="Главная"
        >
          <img src={profileIcons.home} alt="" />
        </button>

        <button
          type="button"
          className="liveHeader__brand"
          onClick={() => navigate("/first-page")}
          aria-label="ME YOU"
        >
          ME YOU
        </button>

        <button
          type="button"
          className="liveHeader__compactButton liveHeader__compactButton--menu"
          onClick={open}
          aria-label="Меню"
        >
          <img src={profileIcons.menu} alt="" />
        </button>
      </header>
    </>
  );
}

import ThemeToggleDark from "../ThemeToggleDark/ThemeToggleDark";
import profileIcons from "../../constants/profileIcons";
import { useBurgerMenu } from "../../hooks/useBurgerMenu";

export default function AppHeader({
  onGoProfile,
  onGoExplore,
  onGoWallet,
  onGoVipChat,
  onGoHome,
  showTabletNav = false,
  variant,
  className = "",
}) {
  const { open } = useBurgerMenu();
  const showHomeIconFromMd = variant === "messenger";

  return (
    <header
      className={`w-full min-w-0 max-w-full overflow-x-clip border-gray-900 2xl:max-w-[1440px] min-[1440px]:mx-auto ${className}`.trim()}
    >
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 md:gap-x-3 xl:gap-x-4 px-[10px] md:px-[41px] lg:px-9 min-[1440px]:px-[66px] pb-2 md:pb-5 xl:pb-4">
        <div className="flex min-w-0 items-center justify-start gap-2 md:gap-3 xl:gap-4">
          <button
            type="button"
            className={`app-header-icon-btn ${showHomeIconFromMd ? "hidden md:flex" : "hidden xl:flex"}`}
            onClick={onGoProfile}
            aria-label="Профіль"
          >
            <img src={profileIcons.home} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="app-header-icon-btn"
            onClick={onGoExplore}
            aria-label="Пошук"
          >
            <img src={profileIcons.search} alt="" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={onGoHome}
          className="logoText app-brand-wordmark max-w-full min-w-0 justify-self-center text-center"
          aria-label="Головна"
        >
          ME YOU
        </button>

        <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3 xl:gap-4">
          <button
            type="button"
            className="app-header-icon-btn hidden md:flex"
            onClick={onGoWallet}
            aria-label="Баланс"
          >
            <img src={profileIcons.balance} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="app-header-icon-btn md:hidden"
            onClick={onGoVipChat}
            aria-label="Чат"
          >
            <img src={profileIcons.chat} alt="" aria-hidden="true" />
          </button>

          <ThemeToggleDark className="app-header-theme-toggle hidden md:inline-flex" />

          <button
            type="button"
            className="app-header-icon-btn hidden md:flex"
            onClick={open}
            aria-label="Меню"
          >
            <img src={profileIcons.menu} alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

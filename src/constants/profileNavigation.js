import icons from "./profileIcons";
// Mobile тільки до 767px (як у SCSS)
export const mobileProfileNav = [
  { key: "home", path: "/first-page", label: "Home", icon: icons.home },
  { key: "user", path: "/profile", label: "Profile", icon: icons.user },
  { key: "bell", path: "/notifications", label: "Notifications", icon: icons.bell },
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];

// Desktop top-right: мій профіль — wallet + theme + burger
export const desktopTopActionsOwner = [
  { key: "balance", path: "/wallet", label: "Wallet", icon: icons.balance },
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];

// Desktop top-right: профіль іншого (friend/vipFriend/regularFriend) — тільки Burger
export const desktopTopActionsFriend = [
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];

// Desktop second row (5 іконок)
export const desktopNavItems = [
  { key: "home", path: "/first-page", label: "Home", icon: icons.home },
  { key: "add", path: "/create", label: "Add", icon: icons.plus },
  { key: "reels", path: "/reels", label: "Reels", icon: icons.video },
  { key: "friends", path: "/friends", label: "Friends", icon: icons.friends },
  { key: "notifications", path: "/notifications", label: "Notifications", icon: icons.bell },
];

/**
 * Варіанти хедера профілю.
 * owner — мій профіль: зліва Search, справа Wallet + Theme + Burger; desktop — другий ряд показується.
 * friend | vipFriend | regularFriend — чужий профіль на desktop: Home + Search + Logo + Burger, нижній ряд (5 іконок) приховано.
 */
export const HEADER_CONFIG = {
  owner: {
    leftButtons: ["search"],
    desktopTop: desktopTopActionsOwner,
    showThemeInRight: true,
    desktopNav: desktopNavItems,
    showDesktopNav: true,
  },
  friend: {
    leftButtons: ["home", "search"],
    desktopTop: desktopTopActionsFriend,
    showThemeInRight: false,
    desktopNav: desktopNavItems,
    showDesktopNav: false,
  },
  vipFriend: {
    leftButtons: ["home", "search"],
    desktopTop: desktopTopActionsFriend,
    showThemeInRight: false,
    desktopNav: desktopNavItems,
    showDesktopNav: false,
  },
  regularFriend: {
    leftButtons: ["home", "search"],
    desktopTop: desktopTopActionsFriend,
    showThemeInRight: false,
    desktopNav: desktopNavItems,
    showDesktopNav: false,
  },
};

import icons from "./profileIcons";
// Mobile тільки до 767px (як у SCSS)
export const mobileProfileNav = [
  { key: "home", path: "/first-page", label: "Home", icon: icons.home },
  { key: "user", path: "/profile", label: "Profile", icon: icons.user },
  { key: "bell", path: "/notifications", label: "Notifications", icon: icons.bell },
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];

// Desktop / Tablet (>=768) — як у макеті зверху справа має бути Messages + Saved + Burger
export const desktopTopActions = [
  { key: "messages", path: "/messages", label: "my messages", icon: icons.chat },
  { key: "saved", path: "/saved", label: "saved", icon: icons.saved }, 
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

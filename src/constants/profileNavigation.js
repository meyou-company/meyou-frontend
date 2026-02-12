import icons from "./profileIcons";

// 📱 Mobile bottom — 4 як у макеті
export const mobileProfileNav = [
  { key: "home", path: "/first-page", label: "Home", icon: icons.home },
  { key: "user", path: "/profile", label: "Profile", icon: icons.user },
  { key: "bell", path: "/notifications", label: "Notifications", icon: icons.bell },
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];


// 🖥 Desktop top right: Messages, Wallet, Theme, Burger
export const desktopTopActions = [
  { key: "messages", path: "/messages", label: "Messages", icon: icons.chat },
  { key: "wallet", path: "/wallet", label: "Wallet", icon: icons.balance },
  { key: "menu", action: "MENU", label: "Menu", icon: icons.menu },
];

// 🖥 Desktop second row (5 іконок)
export const desktopNavItems = [
  { key: "home", path: "/first-page", label: "Home", icon: icons.home },
  { key: "add", path: "/create", label: "Add", icon: icons.plus },
  { key: "posts", path: "/posts", label: "Posts", icon: icons.posts },
  { key: "friends", path: "/friends", label: "Friends", icon: icons.friends },
  { key: "notifications", path: "/notifications", label: "Notifications", icon: icons.bell },
];

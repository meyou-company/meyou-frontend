import profileIcons from "./profileIcons"; 

export const MENU_ITEMS = [
  { id: "profile", icon: profileIcons.profileBlack, label: "Мой профиль" },
  { id: "edit", icon: profileIcons.pencilBlack, label: "Редактировать" },
  { id: "guest", icon: profileIcons.eyeBlack, label: "Посмотреть как гость" },
  { id: "dark", icon: profileIcons.moonBlack, label: "Темная тема" },
  { id: "favorites", icon: profileIcons.heartBlack, label: "Избранное" },
  { id: "blocked", icon: profileIcons.userBlockedBlack, label: "Заблокированные" },
  { id: "policy", icon: profileIcons.privacyBlack, label: "Конфиденциальность" }, 
  { id: "account", icon: profileIcons.settingsBlack, label: "Настройки аккаунта" },
  { id: "security", icon: profileIcons.lockBmBlack, label: "Безопасность" },
  { id: "support", icon: profileIcons.helpBlack, label: "Помощь / Поддержка" },
  { id: "report", icon: profileIcons.complainBlack, label: "Пожаловаться" },
  { id: "about", icon: profileIcons.aboutBlack, label: "О сервисе" },
  { id: "terms", icon: profileIcons.termsBlack, label: "Условия использования" },
  { id: "privacy", icon: profileIcons.confidentialityBlack, label: "Политика конфиденциальности" },
];


// специальные элементы (не в основном списке)

export const CLOSE_ITEM = {
  label: "Закрыть",
  icon: profileIcons.close,
};

export const LANGUAGE_ITEM = {
  label: "Русский",
  icon: profileIcons.arrowRightFilledBlack,
};

export const LOGOUT_ITEM = {
  label: "Выйти",
  icon: profileIcons.exitBlack,
};
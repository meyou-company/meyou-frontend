/** Real destinations for burger menu ids (no /oops placeholders). */
export const BURGER_MENU_ACTIONS = {
  favorites: { kind: 'route', path: '/saved' },
  support: { kind: 'feedback', view: 'compose', composeIntent: 'support' },
  report: { kind: 'feedback', view: 'compose', composeIntent: 'report' },
  about: { kind: 'route', path: '/about' },
};

const LEGACY_OOPS_MENU_IDS = ['favorites', 'support', 'report', 'about'];

export function resolveBurgerMenuAction(menuId) {
  return BURGER_MENU_ACTIONS[menuId] ?? null;
}

/** Regression helper: these items must never navigate to /oops. */
export function burgerMenuIdsThatMustNotUseOops() {
  return [...LEGACY_OOPS_MENU_IDS];
}
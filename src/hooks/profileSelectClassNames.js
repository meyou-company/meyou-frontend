/** Explicit DOM classes for profile form react-select dropdowns (mobile + desktop). */

export const PROFILE_DROPDOWN_MENU_CLASS = 'profile-dropdown-menu';
export const PROFILE_DROPDOWN_OPTION_CLASS = 'profile-dropdown-option';
export const PROFILE_DROPDOWN_OPTION_SELECTED_CLASS = 'profile-dropdown-option--selected';
export const PROFILE_DROPDOWN_OPTION_DISABLED_CLASS = 'profile-dropdown-option--disabled';

export const profileSelectClassNames = {
  menu: () => `profile-form-dropdown ${PROFILE_DROPDOWN_MENU_CLASS}`,
  menuList: () => `${PROFILE_DROPDOWN_MENU_CLASS}__list`,
  option: ({ isSelected, isDisabled, isFocused }) => {
    const classes = [PROFILE_DROPDOWN_OPTION_CLASS];
    if (isSelected) classes.push(PROFILE_DROPDOWN_OPTION_SELECTED_CLASS);
    if (isDisabled) classes.push(PROFILE_DROPDOWN_OPTION_DISABLED_CLASS);
    if (isFocused) classes.push(`${PROFILE_DROPDOWN_OPTION_CLASS}--focused`);
    return classes.join(' ');
  },
  noOptionsMessage: () => `${PROFILE_DROPDOWN_OPTION_CLASS} ${PROFILE_DROPDOWN_OPTION_CLASS}--empty`,
  loadingMessage: () => `${PROFILE_DROPDOWN_OPTION_CLASS} ${PROFILE_DROPDOWN_OPTION_CLASS}--loading`,
};

export function mergeProfileSelectClassNames(extraClassNames = {}) {
  return {
    ...profileSelectClassNames,
    ...extraClassNames,
    menu: (state) => {
      const base = profileSelectClassNames.menu(state);
      const extra = extraClassNames.menu?.(state);
      return extra ? `${base} ${extra}` : base;
    },
    option: (state) => {
      const base = profileSelectClassNames.option(state);
      const extra = extraClassNames.option?.(state);
      return extra ? `${base} ${extra}` : base;
    },
  };
}

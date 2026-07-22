import { useEffect, useMemo, useState } from 'react';
import { mergeProfileSelectClassNames } from './profileSelectClassNames';

export const PROFILE_FORM_MOBILE_BREAKPOINT = 768;

export function useIsMobileProfileForm() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${PROFILE_FORM_MOBILE_BREAKPOINT}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PROFILE_FORM_MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}

/** Desktop: portal popover. Mobile (≤768px): inline menu in document flow. */
export function useProfileSelectProps(extraClassNames) {
  const isMobile = useIsMobileProfileForm();

  return useMemo(() => {
    const classNames = mergeProfileSelectClassNames(extraClassNames);

    const crispDropdownStyles = {
      menu: (base) => ({
        ...base,
        opacity: 1,
        filter: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        backgroundColor: '#12051f',
      }),
      option: (base, state) => ({
        ...base,
        color: state.isDisabled ? 'rgba(255, 255, 255, 0.72)' : '#ffffff',
        opacity: 1,
        filter: 'none',
        fontWeight: 600,
        cursor: state.isDisabled ? 'not-allowed' : 'default',
      }),
    };

    if (isMobile) {
      return {
        menuPlacement: 'bottom',
        menuShouldScrollIntoView: false,
        classNames,
        styles: crispDropdownStyles,
      };
    }

    const menuPortalTarget = typeof document !== 'undefined' ? document.body : null;
    if (!menuPortalTarget) return { classNames, styles: crispDropdownStyles };

    return {
      menuPortalTarget,
      menuPosition: 'fixed',
      menuPlacement: 'auto',
      classNames,
      styles: {
        ...crispDropdownStyles,
        menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
      },
    };
  }, [isMobile, extraClassNames]);
}

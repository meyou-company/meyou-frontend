import { useEffect, useRef, useState } from 'react';
import { isUserVip } from '../../utils/isUserVip';
import './UserAvatar.scss';

export const VIP_BADGE_SRC = '/vip/badge.png';

function sizeStyle(size, style) {
  if (size == null) return style;
  const value = typeof size === 'number' ? `${size}px` : size;
  return { width: value, height: value, ...style };
}

export default function UserAvatar({
  user,
  src,
  alt = '',
  className = '',
  flip = false,
  introFlip = false,
  size,
  style,
  ...imgProps
}) {
  const mergedStyle = sizeStyle(size, style);
  const vip = isUserVip(user);
  const introPlayedRef = useRef(false);
  const [mobileIntro, setMobileIntro] = useState(false);

  useEffect(() => {
    if (!flip || !introFlip || !vip || introPlayedRef.current) return undefined;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    introPlayedRef.current = true;
    const showAt = 1300;
    const holdMs = 1300;
    const flipMs = 600;
    const showTimer = window.setTimeout(() => setMobileIntro(true), showAt);
    const hideTimer = window.setTimeout(() => setMobileIntro(false), showAt + flipMs + holdMs);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [flip, introFlip, vip]);

  if (!vip) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={mergedStyle}
        {...imgProps}
      />
    );
  }

  const rootClass = [
    'userAvatar',
    'userAvatar--vip',
    flip ? 'userAvatar--flip' : '',
    flip && introFlip && mobileIntro ? 'userAvatar--mobileIntro' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const photo = (
    <span className="userAvatar__ring">
      <img
        className="userAvatar__photo"
        src={src}
        alt={alt}
        {...imgProps}
      />
    </span>
  );

  if (!flip) {
    return (
      <span className={rootClass} style={mergedStyle}>
        {photo}
      </span>
    );
  }

  return (
    <span className={rootClass} style={mergedStyle}>
      <span className="userAvatar__scene">
        <span className="userAvatar__face userAvatar__face--front">{photo}</span>
        <span className="userAvatar__face userAvatar__face--back" aria-hidden="true">
          <img
            className="userAvatar__badge"
            src={VIP_BADGE_SRC}
            alt=""
            draggable={false}
          />
        </span>
      </span>
    </span>
  );
}

import './GroupAvatar.scss';

export default function GroupAvatar({
  src,
  name = '',
  className = '',
  size,
}) {
  const style = size ? { width: size, height: size } : undefined;
  const initial = (name || '').trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <span className={`groupAvatar ${className}`.trim()} style={style} aria-hidden="true">
        <img src={src} alt="" />
      </span>
    );
  }

  return (
    <span
      className={`groupAvatar groupAvatar--placeholder ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="groupAvatar__icon" focusable="false">
        <circle cx="15" cy="14" r="6.2" />
        <circle cx="26.5" cy="15.5" r="5.2" />
        <path d="M4.5 31.5c1.2-6.4 6-9.6 12.4-9.6 6.5 0 11.4 3.2 12.6 9.6" />
        <path d="M20 31.8c.8-5.2 4.6-7.8 9.6-7.8 5 0 8.8 2.5 9.9 7.8" />
      </svg>
      {initial ? <span className="groupAvatar__fallback">{initial}</span> : null}
    </span>
  );
}

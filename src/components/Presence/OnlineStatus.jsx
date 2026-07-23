import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatLastSeenAt, normalizePresenceFields } from '../../utils/formatLastSeen';
import { usePresenceStore } from '../../zustand/usePresenceStore';
import './OnlineStatus.scss';

/**
 * Universal online indicator.
 * @param {object} props
 * @param {string} [props.userId]
 * @param {boolean} [props.isOnline] explicit override
 * @param {string|null} [props.lastSeenAt] explicit override
 * @param {object} [props.user] fallback source for id / isOnline / lastSeenAt
 * @param {'dot'|'dot-label'|'label'} [props.variant]
 * @param {boolean} [props.showLabel]
 * @param {string} [props.className]
 */
export default function OnlineStatus({
  userId,
  isOnline: isOnlineProp,
  lastSeenAt: lastSeenAtProp,
  user,
  variant = 'dot',
  showLabel = false,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const id = String(userId ?? user?.id ?? user?._id ?? '');
  const stored = usePresenceStore((s) => (id ? s.byUserId[id] : undefined));

  const { isOnline, lastSeenAt } = useMemo(() => {
    if (typeof isOnlineProp === 'boolean') {
      return {
        isOnline: isOnlineProp,
        lastSeenAt: isOnlineProp ? null : (lastSeenAtProp ?? stored?.lastSeenAt ?? null),
      };
    }
    if (stored) {
      return stored;
    }
    return normalizePresenceFields(user);
  }, [isOnlineProp, lastSeenAtProp, stored, user]);

  const label = isOnline
    ? t('presence.online')
    : formatLastSeenAt(lastSeenAt, t, i18n.language);

  const showDot = variant === 'dot' || variant === 'dot-label';
  const showText = showLabel || variant === 'label' || variant === 'dot-label';

  return (
    <span
      className={`onlineStatus${isOnline ? ' is-online' : ' is-offline'}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
    >
      {showDot ? (
        <span className="onlineStatus__dot" aria-hidden="true" />
      ) : null}
      {showText ? <span className="onlineStatus__label">{label}</span> : null}
    </span>
  );
}

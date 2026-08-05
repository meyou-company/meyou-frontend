import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LuBell,
  LuBellOff,
  LuBan,
  LuMailOpen,
  LuPin,
  LuPinOff,
  LuTrash2,
} from 'react-icons/lu';
import './ChatContextMenu.scss';

function computePosition(anchorRect, menuSize) {
  const pad = 12;
  const gap = 8;
  const { width: menuW, height: menuH } = menuSize;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = anchorRect.bottom + gap;
  let left = anchorRect.right - menuW;

  if (top + menuH > viewportH - pad) {
    top = anchorRect.top - menuH - gap;
  }
  if (left + menuW > viewportW - pad) {
    left = viewportW - menuW - pad;
  }
  if (left < pad) left = pad;
  if (top < pad) top = pad;

  return { top, left };
}

/**
 * Context menu for a chat row in the conversations list.
 * Actions are handled by the parent via onAction(actionId).
 */
export default function ChatContextMenu({
  isOpen,
  anchorRect,
  isPinned = false,
  isMuted = false,
  onClose,
  onAction,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const items = [
    {
      id: 'pin',
      Icon: isPinned ? LuPinOff : LuPin,
      label: isPinned
        ? t('messenger.chatMenu.unpin')
        : t('messenger.chatMenu.pin'),
    },
    {
      id: 'mute',
      Icon: isMuted ? LuBell : LuBellOff,
      label: isMuted
        ? t('messenger.chatMenu.unmute')
        : t('messenger.chatMenu.mute'),
    },
    {
      id: 'unread',
      Icon: LuMailOpen,
      label: t('messenger.chatMenu.markUnread'),
    },
    {
      id: 'block',
      Icon: LuBan,
      label: t('messenger.chatMenu.block'),
      danger: true,
    },
    {
      id: 'delete',
      Icon: LuTrash2,
      label: t('messenger.chatMenu.delete'),
      danger: true,
    },
  ];

  useLayoutEffect(() => {
    if (!isOpen || !anchorRect || !menuRef.current) {
      setReady(false);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    setPosition(computePosition(anchorRect, rect));
    setReady(true);
  }, [isOpen, anchorRect, isPinned, isMuted]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onScroll = () => onClose?.();

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  return (
    <div className="chatContextMenuOverlay" role="presentation">
      <div
        ref={menuRef}
        className={`chatContextMenu${ready ? ' is-ready' : ''}`}
        style={{ top: position.top, left: position.left }}
        role="menu"
        aria-label={t('messenger.chatMenu.title')}
      >
        <ul className="chatContextMenu__list">
          {items.map(({ id, Icon, label, danger }) => (
            <li key={id}>
              <button
                type="button"
                role="menuitem"
                className={`chatContextMenu__item${danger ? ' chatContextMenu__item--danger' : ''}`}
                onClick={() => onAction?.(id)}
              >
                <span className="chatContextMenu__icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

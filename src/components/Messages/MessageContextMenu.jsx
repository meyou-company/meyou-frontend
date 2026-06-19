import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LuCopy,
  LuFlag,
  LuForward,
  LuLanguages,
  LuPencil,
  LuPin,
  LuReply,
  LuTrash2,
} from 'react-icons/lu';
import './MessageContextMenu.scss';

const ALL_MENU_ITEMS = [
  { id: 'reply', Icon: LuReply },
  { id: 'forward', Icon: LuForward },
  { id: 'copy', Icon: LuCopy },
  { id: 'translate', Icon: LuLanguages },
  { id: 'edit', Icon: LuPencil, mineOnly: true, textOnly: true },
  { id: 'pin', Icon: LuPin },
  { id: 'deleteForMe', Icon: LuTrash2 },
  { id: 'deleteForAll', Icon: LuTrash2, mineOnly: true },
  { id: 'report', Icon: LuFlag, danger: true, theirsOnly: true },
];

function computePosition(anchorRect, menuSize, isMine) {
  const pad = 12;
  const gap = 10;
  const { width: menuW, height: menuH } = menuSize;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = anchorRect.bottom + gap;
  let left = isMine ? anchorRect.right - menuW : anchorRect.left;

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

export default function MessageContextMenu({
  isOpen,
  anchorRect,
  isMine = false,
  message,
  pinnedMessageId,
  dateLabel = '',
  timeLabel = '',
  onClose,
  onAction,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const menuItems = useMemo(() => {
    const isText = message?.type === 'TEXT' || !message?.type;
    return ALL_MENU_ITEMS.filter((item) => {
      if (item.mineOnly && !isMine) return false;
      if (item.theirsOnly && isMine) return false;
      if (item.textOnly && !isText) return false;
      if (message?.deletedForEveryone && item.id !== 'deleteForMe') return false;
      return true;
    }).map((item) => {
      if (item.id === 'pin' && pinnedMessageId === message?.id) {
        return { ...item, labelKey: 'messenger.menu.unpin' };
      }
      return item;
    });
  }, [isMine, message, pinnedMessageId]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRect || !menuRef.current) {
      setReady(false);
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    setPosition(computePosition(anchorRect, rect, isMine));
    setReady(true);
  }, [isOpen, anchorRect, isMine, dateLabel, timeLabel, menuItems.length]);

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

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  return (
    <div className="msgContextMenuOverlay" role="presentation" aria-hidden={!ready}>
      <div
        ref={menuRef}
        className={`msgContextMenu${ready ? ' is-ready' : ''}`}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        {dateLabel || timeLabel ? (
          <header className="msgContextMenu__header" role="presentation">
            {dateLabel ? (
              <span className="msgContextMenu__headerLine">{dateLabel}</span>
            ) : null}
            {timeLabel ? (
              <span className="msgContextMenu__headerLine">{timeLabel}</span>
            ) : null}
          </header>
        ) : null}
        <ul className="msgContextMenu__list">
          {menuItems.map(({ id, Icon, danger, labelKey }) => (
            <li key={id}>
              <button
                type="button"
                className={`msgContextMenu__item${danger ? ' msgContextMenu__item--danger' : ''}`}
                role="menuitem"
                onClick={() => onAction?.(id)}
              >
                <span className="msgContextMenu__icon" aria-hidden="true">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                {t(labelKey || `messenger.menu.${id}`)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './WalletTooltip.scss';

function isHoverDevice() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function isFocusableChild(child) {
  if (!isValidElement(child)) return false;
  if (child.type === 'button' || child.type === 'a') return true;
  const tabIndex = child.props?.tabIndex;
  return tabIndex != null && Number(tabIndex) >= 0;
}

export default function WalletTooltip({ text, placement = 'top', children }) {
  const tooltipId = useId();
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const hide = () => {
    clearClose();
    setOpen(false);
  };

  const show = () => {
    if (!text) return;
    clearClose();
    window.dispatchEvent(new CustomEvent('wallet-tooltip-open', { detail: tooltipId }));
    setOpen(true);
  };

  const hideSoon = () => {
    clearClose();
    closeTimer.current = setTimeout(hide, 140);
  };

  useEffect(() => {
    const onOther = (e) => {
      if (e.detail !== tooltipId) setOpen(false);
    };
    window.addEventListener('wallet-tooltip-open', onOther);
    return () => window.removeEventListener('wallet-tooltip-open', onOther);
  }, [tooltipId]);

  useEffect(() => () => clearClose(), []);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') hide();
    };
    const onPointer = (e) => {
      if (isHoverDevice()) return;
      const target = e.target;
      if (wrapRef.current?.contains(target) || bubbleRef.current?.contains(target)) {
        return;
      }
      hide();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const place = () => {
      const trigger = wrapRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;

      const r = trigger.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const candidates = {
        top: { top: r.top - b.height - 8, left: r.left + r.width / 2 - b.width / 2 },
        bottom: { top: r.bottom + 8, left: r.left + r.width / 2 - b.width / 2 },
        left: { top: r.top + r.height / 2 - b.height / 2, left: r.left - b.width - 8 },
        right: { top: r.top + r.height / 2 - b.height / 2, left: r.right + 8 },
      };

      const order = [placement, 'bottom', 'top', 'right', 'left'].filter(
        (side, i, arr) => arr.indexOf(side) === i,
      );

      let chosen = candidates[placement] || candidates.top;
      for (const side of order) {
        const c = candidates[side];
        if (!c) continue;
        const fits =
          c.top >= pad &&
          c.left >= pad &&
          c.top + b.height <= vh - pad &&
          c.left + b.width <= vw - pad;
        if (fits) {
          chosen = c;
          break;
        }
      }

      setCoords({
        top: Math.min(Math.max(pad, chosen.top), Math.max(pad, vh - b.height - pad)),
        left: Math.min(Math.max(pad, chosen.left), Math.max(pad, vw - b.width - pad)),
      });
    };

    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, placement, text]);

  const onClickCapture = (e) => {
    if (isHoverDevice()) return;
    e.preventDefault();
    e.stopPropagation();
    if (open) hide();
    else show();
  };

  let trigger = children;
  if (isValidElement(children)) {
    const describedBy = [children.props['aria-describedby'], open ? tooltipId : null]
      .filter(Boolean)
      .join(' ');
    trigger = cloneElement(children, {
      'aria-describedby': describedBy || undefined,
    });
  }

  return (
    <span
      className="wallet-tooltip"
      ref={wrapRef}
      tabIndex={isFocusableChild(children) ? undefined : 0}
      onMouseEnter={() => {
        if (isHoverDevice()) show();
      }}
      onMouseLeave={() => {
        if (isHoverDevice()) hideSoon();
      }}
      onFocus={() => {
        if (isHoverDevice()) show();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) hide();
      }}
      onClickCapture={onClickCapture}
    >
      {trigger}
      {open && text
        ? createPortal(
            <span
              ref={bubbleRef}
              id={tooltipId}
              role="tooltip"
              className="wallet-tooltip__bubble"
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={clearClose}
              onMouseLeave={() => {
                if (isHoverDevice()) hideSoon();
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

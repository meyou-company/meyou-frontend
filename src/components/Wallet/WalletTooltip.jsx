import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './WalletTooltip.scss';

const HOVER_MQ = '(hover: hover) and (pointer: fine)';
const COMPACT_MQ = '(max-width: 640px)';
const LONG_TEXT = 72;

function mqMatches(query, fallback = false) {
  if (typeof window === 'undefined') return fallback;
  return window.matchMedia(query).matches;
}

function useHintMode(text) {
  const [hoverFine, setHoverFine] = useState(() => mqMatches(HOVER_MQ, true));
  const [compact, setCompact] = useState(() => mqMatches(COMPACT_MQ));

  useEffect(() => {
    const hoverMq = window.matchMedia(HOVER_MQ);
    const compactMq = window.matchMedia(COMPACT_MQ);
    const sync = () => {
      setHoverFine(hoverMq.matches);
      setCompact(compactMq.matches);
    };
    sync();
    hoverMq.addEventListener('change', sync);
    compactMq.addEventListener('change', sync);
    return () => {
      hoverMq.removeEventListener('change', sync);
      compactMq.removeEventListener('change', sync);
    };
  }, []);

  const long = String(text || '').length > LONG_TEXT;
  return {
    hoverFine,
    useSheet: !hoverFine && (compact || long),
  };
}

export default function WalletTooltip({
  title,
  text,
  placement = 'top',
  children,
}) {
  const { t } = useTranslation();
  const tooltipId = useId();
  const titleId = `${tooltipId}-title`;
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);
  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const { hoverFine, useSheet } = useHintMode(text);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const hide = (restoreFocus = false) => {
    clearClose();
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus?.();
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

  const toggle = () => {
    if (open) hide();
    else show();
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
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide(true);
      }
    };
    const onPointer = (e) => {
      const target = e.target;
      if (wrapRef.current?.contains(target) || bubbleRef.current?.contains(target)) {
        return;
      }
      hide();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    if (useSheet) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      closeBtnRef.current?.focus?.();
      return () => {
        document.body.style.overflow = prev;
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onPointer);
      };
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, useSheet]);

  useEffect(() => {
    if (!open || useSheet) return undefined;

    const place = () => {
      const trigger = triggerRef.current || wrapRef.current;
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
  }, [open, placement, text, useSheet, title]);

  const closeLabel = t('common.close');
  const infoLabel = t('walletPage.hintAria', { label: title || '' });

  const closeBtn = (
    <button
      ref={closeBtnRef}
      type="button"
      className="wallet-hint__close"
      onClick={() => hide(true)}
      aria-label={closeLabel}
    >
      ×
    </button>
  );

  const panel = open && text
    ? createPortal(
        useSheet ? (
          <div className="wallet-hint__backdrop" onClick={hide}>
            <div
              ref={bubbleRef}
              className="wallet-hint__sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={tooltipId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wallet-hint__sheetHead">
                {title ? (
                  <h3 id={titleId} className="wallet-hint__sheetTitle">
                    {title}
                  </h3>
                ) : (
                  <span />
                )}
                {closeBtn}
              </div>
              <p id={tooltipId} className="wallet-hint__sheetText">
                {text}
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={bubbleRef}
            id={tooltipId}
            role="tooltip"
            className={`wallet-hint__bubble${hoverFine ? '' : ' wallet-hint__bubble--touch'}`}
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={() => {
              if (hoverFine) clearClose();
            }}
            onMouseLeave={() => {
              if (hoverFine) hideSoon();
            }}
          >
            {!hoverFine ? closeBtn : null}
            {title && !hoverFine ? (
              <p className="wallet-hint__bubbleTitle">{title}</p>
            ) : null}
            <p className="wallet-hint__bubbleText">{text}</p>
          </div>
        ),
        document.body,
      )
    : null;

  return (
    <span
      className={`wallet-hint${children ? ' wallet-hint--withLabel' : ''}`}
      ref={wrapRef}
      onMouseEnter={() => {
        if (hoverFine) show();
      }}
      onMouseLeave={() => {
        if (hoverFine) hideSoon();
      }}
    >
      {children}
      <button
        ref={triggerRef}
        type="button"
        className="wallet-hint__info"
        aria-label={infoLabel}
        aria-expanded={open}
        aria-describedby={open && !useSheet ? tooltipId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hoverFine) return;
          toggle();
        }}
        onFocus={() => {
          if (hoverFine) show();
        }}
        onBlur={(e) => {
          if (!hoverFine) return;
          if (!wrapRef.current?.contains(e.relatedTarget) && !bubbleRef.current?.contains(e.relatedTarget)) {
            hide();
          }
        }}
      >
        i
      </button>
      {panel}
    </span>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Select, { components } from 'react-select';

const DESKTOP_VISIBLE = 5;
const TABLET_VISIBLE = 3;
const MOBILE_VISIBLE = 1;

function useVisibleCount() {
  const [count, setCount] = useState(DESKTOP_VISIBLE);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 480) setCount(MOBILE_VISIBLE);
      else if (window.innerWidth < 768) setCount(TABLET_VISIBLE);
      else setCount(DESKTOP_VISIBLE);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return count;
}

export default function MultiSelect({
  value = [],
  onChange,
  options = [],
  max = 10,
  placeholder = '',
  onBlur,
  error,
  selectProps = {},
}) {
  const visibleCount = useVisibleCount();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleRemove = (item) => {
    const next = value.filter((v) => v.value !== item.value);
    onChange(next);
  };

  const handleChange = (arr) => {
    const limited = (arr || []).slice(0, max);

    Promise.resolve().then(() => {
      onChange?.(limited);
    });
  };

  useEffect(() => {
    setOpen(false);
  }, [value]);

  // close popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!wrapperRef.current?.contains(e.target) && !popoverRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MultiValue = (props) => {
    const selected = props.getValue();

    if (props.index < visibleCount) {
      return <components.MultiValue {...props} />;
    }

    if (props.index === visibleCount) {
      const hidden = selected.slice(visibleCount);

      const togglePopover = () => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();

        setPos({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });

        setOpen((o) => !o);
      };

      return (
        <div className="more-badge" ref={wrapperRef}>
          <button
            ref={buttonRef}
            type="button"
            className="more-button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePopover();
            }}
          >
            +{hidden.length}
          </button>

          {open &&
            createPortal(
              <div
                className="more-popover"
                ref={popoverRef}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  zIndex: 9999,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {hidden.map((item) => (
                  <div key={item.value} className="popover-item">
                    <span>{item.label}</span>

                    <button
                      type="button"
                      className="remove-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(item);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>,
              document.body
            )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="field">
      <div className="field__wrap select-wrap">
        <Select
          classNamePrefix="rs"
          isMulti
          placeholder={placeholder}
          value={value}
          options={options}
          components={{ MultiValue }}
          onChange={handleChange}
          onBlur={onBlur}
          isOptionDisabled={() => value?.length >= max}
          {...selectProps}
        />
      </div>

      <div className="field__meta">
        <span className="field__note">*максимум {max}</span>
        <span className="field__counter">
          {value.length}/{max}
        </span>
      </div>

      {error && <div className="field__hint">{error}</div>}
    </div>
  );
}

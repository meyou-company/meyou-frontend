import { useCallback, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const CELL_COUNT = 6;

function OtpCells({ id, value, onChange, disabled, autoFocus, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: CELL_COUNT }, (_, i) => value[i] ?? '');

  const focusCell = useCallback((index) => {
    const el = refs.current[index];
    el?.focus();
    el?.select();
  }, []);

  const applyDigits = useCallback(
    (nextDigits) => {
      const joined = nextDigits.join('').replace(/\D/g, '').slice(0, CELL_COUNT);
      onChange(joined);
      const focusAt = Math.min(joined.length, CELL_COUNT - 1);
      if (joined.length < CELL_COUNT) {
        focusCell(joined.length);
      } else if (joined.length === CELL_COUNT) {
        focusCell(CELL_COUNT - 1);
      } else {
        focusCell(focusAt);
      }
    },
    [onChange, focusCell],
  );

  const handleCellChange = (index, raw) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    if (char && index < CELL_COUNT - 1) {
      applyDigits(next);
      focusCell(index + 1);
    } else {
      onChange(next.join('').slice(0, CELL_COUNT));
    }
  };

  const handleKeyDown = (index, ev) => {
    if (ev.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        onChange(next.join(''));
      } else if (index > 0) {
        focusCell(index - 1);
        const next = [...digits];
        next[index - 1] = '';
        onChange(next.join(''));
      }
      ev.preventDefault();
    }
    if (ev.key === 'ArrowLeft' && index > 0) {
      focusCell(index - 1);
      ev.preventDefault();
    }
    if (ev.key === 'ArrowRight' && index < CELL_COUNT - 1) {
      focusCell(index + 1);
      ev.preventDefault();
    }
  };

  const handlePaste = (ev) => {
    ev.preventDefault();
    const text = ev.clipboardData?.getData('text') ?? '';
    const joined = text.replace(/\D/g, '').slice(0, CELL_COUNT);
    onChange(joined);
    focusCell(Math.min(joined.length, CELL_COUNT - 1));
  };

  const handleAutofill = (ev) => {
    const joined = ev.target.value.replace(/\D/g, '').slice(0, CELL_COUNT);
    onChange(joined);
  };

  return (
    <div className="mfa-otp-cells">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="mfa-otp-cells__autofill"
        tabIndex={-1}
        aria-hidden
        onChange={handleAutofill}
      />
      <div className="mfa-otp-cells__row" role="group" aria-labelledby={id}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            className={`mfa-otp-cells__cell ${digit ? 'is-filled' : ''}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-invalid={invalid}
            aria-label={`${index + 1} / ${CELL_COUNT}`}
            onChange={(ev) => handleCellChange(index, ev.target.value)}
            onKeyDown={(ev) => handleKeyDown(index, ev)}
            onPaste={handlePaste}
            onFocus={(ev) => ev.target.select()}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Accessible MFA/TOTP code input with theme-aware contrast (uses authField styles).
 */
export default function MfaCodeField({
  id: idProp,
  label,
  hint,
  error,
  value,
  onChange,
  mode = 'totp',
  variant = 'auto',
  disabled = false,
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const id = idProp ?? autoId;
  const isTotp = mode === 'totp';
  const useCells = isTotp && variant !== 'single' && (variant === 'cells' || variant === 'auto');

  const handleChange = (ev) => {
    let next = ev.target.value;
    if (isTotp) {
      next = next.replace(/\D/g, '').slice(0, 6);
    }
    onChange(next);
  };

  const handlePaste = (ev) => {
    const text = ev.clipboardData?.getData('text') ?? '';
    if (isTotp) {
      ev.preventDefault();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      onChange(digits);
    }
  };

  return (
    <div className={`authField mfa-code-field ${error ? 'is-error' : ''}`}>
      {label ? (
        <label className="mfa-code-field__label" htmlFor={useCells ? undefined : id} id={useCells ? id : undefined}>
          {label}
        </label>
      ) : null}
      {useCells ? (
        <OtpCells
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          invalid={Boolean(error)}
        />
      ) : (
        <div className="authField__control mfa-code-field__control">
          <input
            id={id}
            className="authField__input mfa-code-field__input"
            type={isTotp ? 'tel' : 'text'}
            inputMode={isTotp ? 'numeric' : 'text'}
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={isTotp ? 6 : 12}
            placeholder={
              isTotp ? t('auth.mfa.totpPlaceholder') : t('auth.mfa.backupPlaceholder')
            }
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          />
        </div>
      )}
      {hint && !error ? (
        <p className="authField__hint mfa-code-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="authField__hint mfa-code-field__error" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
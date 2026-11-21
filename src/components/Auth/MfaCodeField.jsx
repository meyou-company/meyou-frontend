import { useId } from 'react';
import { useTranslation } from 'react-i18next';

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
  disabled = false,
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const id = idProp ?? autoId;
  const isTotp = mode === 'totp';

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
        <label className="mfa-code-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
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
            isTotp
              ? t('auth.mfa.totpPlaceholder')
              : t('auth.mfa.backupPlaceholder')
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
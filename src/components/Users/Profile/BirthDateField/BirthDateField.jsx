import { useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  BIRTH_DATE_MASK_MAX_LENGTH,
  applyBirthDateMaskChange,
  birthDateToLocalDate,
  getBirthDateLimits,
  normalizeBirthDateInput,
  toYMDLocal,
  ymdToDisplayMask,
} from '../../../../utils/profileFormUtils';
import './BirthDateField.scss';

function displayFromValue(value) {
  if (!value) return '';
  const normalized = normalizeBirthDateInput(value);
  if (normalized) return ymdToDisplayMask(normalized);
  return String(value);
}

export default function BirthDateField({
  value = '',
  onChange,
  onBlur,
  hasError = false,
  placeholderText = 'DD.MM.YYYY',
  ariaLabel,
  required = false,
  showStar = false,
}) {
  const { minDate, maxDate } = getBirthDateLimits();
  const wrapRef = useRef(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(() => displayFromValue(value));

  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }

    const normalized = normalizeBirthDateInput(value);
    if (normalized) {
      setDisplayValue(ymdToDisplayMask(normalized));
    }
  }, [value]);

  useEffect(() => {
    if (!calendarOpen) return undefined;

    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [calendarOpen]);

  const handleInputChange = (event) => {
    const masked = applyBirthDateMaskChange(event.target.value, displayValue);
    setDisplayValue(masked);
  };

  const handleInputBlur = () => {
    const trimmed = displayValue.trim();
    if (!trimmed) {
      onChange?.('');
      onBlur?.();
      return;
    }

    const normalized = normalizeBirthDateInput(trimmed);
    if (normalized) {
      onChange?.(normalized);
      setDisplayValue(ymdToDisplayMask(normalized));
    } else {
      onChange?.(trimmed);
    }

    onBlur?.();
  };

  const handleCalendarChange = (date) => {
    const normalized = date ? toYMDLocal(date) : '';
    onChange?.(normalized);
    setDisplayValue(normalized ? ymdToDisplayMask(normalized) : '');
    setCalendarOpen(false);
  };

  return (
    <div className="field__wrap field__wrap--birthDate" ref={wrapRef}>
      {showStar && <span className="field__star">*</span>}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        className={`text-input field__date-input ${hasError ? 'is-error' : ''}`}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholderText}
        aria-label={ariaLabel}
        required={required}
        maxLength={BIRTH_DATE_MASK_MAX_LENGTH}
      />
      <button
        type="button"
        className="field__date-indicator"
        aria-label={placeholderText}
        aria-expanded={calendarOpen}
        onClick={() => setCalendarOpen((open) => !open)}
      />
      {calendarOpen && (
        <div className="birthDate-picker-anchor profile-form-dropdown">
          <DatePicker
            inline
            selected={birthDateToLocalDate(value)}
            minDate={minDate}
            maxDate={maxDate}
            onChange={handleCalendarChange}
            calendarClassName="birthDate-picker"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            yearDropdownItemNumber={100}
          />
        </div>
      )}
    </div>
  );
}

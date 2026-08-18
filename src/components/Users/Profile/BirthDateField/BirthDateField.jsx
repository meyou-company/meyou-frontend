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
  const fieldRef = useRef(null);

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

    const handleDocumentMouseDown = (event) => {
      const target = event.target;

      const clickedField = fieldRef.current?.contains(target);

      const calendar = document.querySelector('#birth-date-picker-portal .react-datepicker');

      const clickedCalendar = calendar?.contains(target);

      if (!clickedField && !clickedCalendar) {
        setCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
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

  const handleInputClick = () => {
    setCalendarOpen(true);
  };

  const handleIndicatorClick = () => {
    setCalendarOpen((open) => !open);
  };

  return (
    <div
      ref={fieldRef}
      className={`field__wrap field__wrap--birthDate ${hasError ? 'is-error' : ''}`}
    >
      {showStar && <span className="field__star">*</span>}

      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        className={`text-input field__date-input ${hasError ? 'is-error' : ''}`}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onClick={handleInputClick}
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
        onClick={handleIndicatorClick}
      />

      <DatePicker
        selected={birthDateToLocalDate(value)}
        onChange={handleCalendarChange}
        minDate={minDate}
        maxDate={maxDate}
        open={calendarOpen}
        onClickOutside={() => setCalendarOpen(false)}
        popperClassName="birthDate-picker"
        popperPlacement="bottom-start"
        portalId="birth-date-picker-portal"
        customInput={<span aria-hidden="true" />}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={100}
      />
    </div>
  );
}

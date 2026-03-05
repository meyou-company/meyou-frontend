'use client'
import { useState, useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import Select, { components } from 'react-select'
import './EditProfileForm.scss'

const DESKTOP_VISIBLE = 5
const TABLET_VISIBLE = 3
const MOBILE_VISIBLE = 1

function useVisibleCount() {
  const [count, setCount] = useState(DESKTOP_VISIBLE)
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 480) {
        setCount(MOBILE_VISIBLE)
      } else if (window.innerWidth < 768) {
        setCount(TABLET_VISIBLE)
      } else {
        setCount(DESKTOP_VISIBLE)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return count
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
  const visibleCount = useVisibleCount()

  const MultiValue = (props) => {
    const selected = props.getValue()
    if (props.index < visibleCount) {
      return <components.MultiValue {...props} />
    }

    if (props.index === visibleCount) {
      const moreCount = selected.length - visibleCount
      return <div className="more-badge">+{moreCount}</div>
    }
    return null
  }

  const handleChange = (arr) => {
    const limited = (arr || []).slice(0, max)
    onChange?.(limited)
  }

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
          isOptionDisabled={() => value.length >= max}
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
  )
}

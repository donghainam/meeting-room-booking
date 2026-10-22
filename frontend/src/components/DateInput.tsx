import { useId, useRef } from 'react'
import { formatDisplayDate, normalizeDateText, parseDisplayDate } from '../time'

interface Props {
  label: string
  // Chữ người dùng đang gõ; hiểu được thì khi rời ô sẽ viết lại thành dd/MM/yyyy
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}

// Ô gõ ngày tự do (2 3 2026, 2/3/2026...) kèm nút mở lịch để chọn bằng chuột.
// Lịch là <input type="date"> ẩn chỉ dùng để mở bảng chọn; giá trị của nó luôn là yyyy-MM-dd nên không phụ thuộc locale trình duyệt.
export default function DateInput({ label, value, onChange, invalid }: Props) {
  const id = useId()
  const pickerRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    const picker = pickerRef.current
    if (picker && typeof picker.showPicker === 'function') {
      picker.showPicker()
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-button">
        <input
          id={id}
          className="input"
          inputMode="numeric"
          placeholder="dd/MM/yyyy"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(normalizeDateText(value))}
          aria-invalid={invalid}
        />
        <button
          className="icon-button"
          type="button"
          aria-label={`Chọn ${label.toLowerCase()} từ lịch`}
          onClick={openPicker}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        <input
          ref={pickerRef}
          className="visually-hidden"
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={parseDisplayDate(value) ?? ''}
          onChange={(e) => e.target.value && onChange(formatDisplayDate(e.target.value))}
        />
      </div>
    </div>
  )
}

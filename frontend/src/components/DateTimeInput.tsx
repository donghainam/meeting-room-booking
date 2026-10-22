import { useId } from 'react'
import { normalizeClockText } from '../time'
import DateInput from './DateInput'

interface Props {
  // "Bắt đầu" hoặc "Kết thúc": ghép với "Ngày"/"Giờ" làm nhãn của hai ô
  label: string
  date: string
  clock: string
  onDateChange: (value: string) => void
  onClockChange: (value: string) => void
  error?: string
}

// Ngày (gõ tự do hoặc chọn lịch) + giờ 24h (gõ tự do: 9 30, 930, 14h30...), hiển thị giống nhau trên mọi trình duyệt/locale
export default function DateTimeInput({ label, date, clock, onDateChange, onClockChange, error }: Props) {
  const clockId = useId()
  return (
    <div className="field">
      <div className="datetime-row">
        <DateInput label={`Ngày ${label.toLowerCase()}`} value={date} onChange={onDateChange} invalid={!!error} />
        <div className="field">
          <label htmlFor={clockId}>Giờ {label.toLowerCase()}</label>
          <input
            id={clockId}
            className="input"
            inputMode="numeric"
            placeholder="HH:mm"
            value={clock}
            onChange={(e) => onClockChange(e.target.value)}
            onBlur={() => onClockChange(normalizeClockText(clock))}
            aria-invalid={!!error}
          />
        </div>
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  )
}

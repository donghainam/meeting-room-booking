import { useState, type FormEvent } from 'react'
import { createBooking, updateBooking } from '../api/bookings'
import { bookingErrorMessage, isStaleError, isUnauthorized } from '../errors'
import { combineDateTime, formatDisplayDate, toApiDateTime, toInputValue } from '../time'
import type { Booking, Room } from '../types'
import { validateBooking, type BookingFormErrors } from '../validation'
import DateTimeInput from './DateTimeInput'
import ErrorDialog from './ErrorDialog'

interface Props {
  room: Room
  // Có booking thì là sửa (A4), không có thì là đặt mới (A3)
  booking?: Booking
  // Ngày (dd/MM/yyyy) đang xem trên lịch, điền sẵn cho lượt đặt mới để không phải gõ lại
  defaultDate?: string
  onSaved: (saved: Booking) => void
  onClose: () => void
  // Dữ liệu đang hiển thị đã cũ (91/93/97): cha tải lại lịch
  onStale: () => void
}

export default function BookingForm({ room, booking, defaultDate = '', onSaved, onClose, onStale }: Props) {
  const [title, setTitle] = useState(booking?.title ?? '')
  const [attendees, setAttendees] = useState(booking ? String(booking.attendees) : '')
  const [startDate, setStartDate] = useState(booking ? formatDisplayDate(booking.startTime) : defaultDate)
  const [startClock, setStartClock] = useState(booking ? toInputValue(booking.startTime).slice(11) : '')
  const [endDate, setEndDate] = useState(booking ? formatDisplayDate(booking.endTime) : defaultDate)
  const [endClock, setEndClock] = useState(booking ? toInputValue(booking.endTime).slice(11) : '')
  const [errors, setErrors] = useState<BookingFormErrors>({})
  const [failure, setFailure] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setFailure('')
    const startTime = combineDateTime(startDate, startClock)
    const endTime = combineDateTime(endDate, endClock)
    const found = validateBooking({ title, attendees, startTime, endTime })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    const input = {
      title: title.trim(),
      attendees: Number(attendees),
      startTime: toApiDateTime(startTime),
      endTime: toApiDateTime(endTime),
    }
    setSubmitting(true)
    try {
      const saved = booking ? await updateBooking(booking.id, input) : await createBooking(room.id, input)
      onSaved(saved)
    } catch (err) {
      if (!isUnauthorized(err)) {
        setFailure(bookingErrorMessage(err))
        if (isStaleError(err)) {
          onStale()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="heading">{booking ? 'Sửa lượt đặt' : 'Đặt phòng'}</h2>
      <p className="muted">
        {room.name} · sức chứa tối đa {room.capacity} người
      </p>
      <label className="field">
        <span>Tiêu đề</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
        {errors.title && <span className="error" role="alert">{errors.title}</span>}
      </label>
      <label className="field">
        <span>Số người</span>
        <input
          className="input"
          inputMode="numeric"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          aria-invalid={!!errors.attendees}
        />
        {errors.attendees && <span className="error" role="alert">{errors.attendees}</span>}
      </label>
      <DateTimeInput
        label="Bắt đầu"
        date={startDate}
        clock={startClock}
        onDateChange={setStartDate}
        onClockChange={setStartClock}
        error={errors.startTime}
      />
      <DateTimeInput
        label="Kết thúc"
        date={endDate}
        clock={endClock}
        onDateChange={setEndDate}
        onClockChange={setEndClock}
        error={errors.endTime}
      />
      <div className="actions">
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu…' : booking ? 'Lưu thay đổi' : 'Đặt phòng'}
        </button>
        <button className="button button-outline" type="button" onClick={onClose} disabled={submitting}>
          Đóng
        </button>
      </div>
      {failure && (
        <ErrorDialog
          title={booking ? 'Sửa lượt đặt không thành công' : 'Đặt phòng không thành công'}
          message={failure}
          onClose={() => setFailure('')}
        />
      )}
    </form>
  )
}

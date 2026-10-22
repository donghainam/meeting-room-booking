import { useState } from 'react'
import { formatRange, hasStarted } from '../time'
import type { Booking, Session } from '../types'

interface Props {
  booking: Booking
  session: Session
  onEdit: (booking: Booking) => void
  onCancel: (booking: Booking) => Promise<void>
}

// Chỉ là gợi ý cho UI: BR7 (người đặt hoặc ADMIN) và BR8 (chưa bắt đầu) do server quyết định bằng mã 92/97
function canModify(booking: Booking, session: Session): boolean {
  const owner = booking.organizer.toLowerCase() === session.username.toLowerCase()
  return (owner || session.role === 'ADMIN') && booking.status === 'BOOKED' && !hasStarted(booking.startTime)
}

export default function BookingRow({ booking, session, onEdit, onCancel }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onCancel(booking)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <li className="booking-row">
      <div className="booking-time">{formatRange(booking.startTime, booking.endTime)}</div>
      <div className="booking-info">
        <span className="booking-title">{booking.title}</span>
        <span className="muted">
          {booking.organizer} · {booking.attendees} người
        </span>
      </div>
      {canModify(booking, session) && (
        <div className="actions">
          <button className="button button-outline" type="button" onClick={() => onEdit(booking)} disabled={busy}>
            Sửa
          </button>
          {confirming ? (
            <>
              <button className="button button-primary" type="button" onClick={handleConfirm} disabled={busy}>
                {busy ? 'Đang hủy…' : 'Chắc chắn hủy?'}
              </button>
              <button className="button button-outline" type="button" onClick={() => setConfirming(false)} disabled={busy}>
                Giữ lại
              </button>
            </>
          ) : (
            <button className="button button-outline" type="button" onClick={() => setConfirming(true)}>
              Hủy
            </button>
          )}
        </div>
      )}
    </li>
  )
}

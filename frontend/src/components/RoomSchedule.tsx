import { useEffect, useState } from 'react'
import { cancelBooking, listSchedule } from '../api/bookings'
import { ApiError } from '../api/client'
import { bookingErrorMessage, isStaleError, isUnauthorized } from '../errors'
import { formatDisplayDate, formatRange, parseDisplayDate, todayInHcm } from '../time'
import type { Booking, Room, Session } from '../types'
import BookingForm from './BookingForm'
import BookingRow from './BookingRow'
import DateInput from './DateInput'
import ErrorDialog from './ErrorDialog'

interface Props {
  room: Room
  session: Session
  // yyyy-MM-dd; không truyền thì mở ở hôm nay
  initialDate?: string
  onBack: () => void
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; bookings: Booking[] }

// null: đang đóng form; 'new': đặt mới; Booking: đang sửa lượt đó
type Editing = null | 'new' | Booking

export default function RoomSchedule({ room, session, initialDate, onBack }: Props) {
  // `date` (yyyy-MM-dd) dùng để gọi API; `dateText` (dd/MM/yyyy) là thứ người dùng đang gõ
  const [date, setDate] = useState(() => initialDate ?? todayInHcm())
  const [dateText, setDateText] = useState(() => formatDisplayDate(initialDate ?? todayInHcm()))
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Editing>(null)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!date) {
      return
    }
    let cancelled = false
    listSchedule(room.id, date)
      .then((bookings) => {
        if (!cancelled) {
          setState({ status: 'ready', bookings })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? bookingErrorMessage(err) : 'Không tải được lịch phòng.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [room.id, date, reloadKey])

  function reload() {
    setReloadKey((n) => n + 1)
  }

  function handleDateChange(text: string) {
    setDateText(text)
    const parsed = parseDisplayDate(text)
    if (parsed === date) {
      return
    }
    setDate(parsed ?? '')
    // Đang gõ dở thì chưa đụng tới lịch và form đang mở; chỉ khi ngày hợp lệ mới chuyển sang ngày mới
    if (parsed) {
      setState({ status: 'loading' })
      setEditing(null)
      setActionError('')
      setNotice('')
    }
  }

  // Lượt vừa lưu có thể nằm ở ngày khác ngày đang xem; không chuyển sang ngày đó thì người dùng sẽ không thấy lượt mình vừa đặt
  function handleSaved(saved: Booking) {
    const verb = editing === 'new' ? 'Đã đặt phòng' : 'Đã cập nhật lượt đặt'
    setNotice(`${verb} "${saved.title}" lúc ${formatRange(saved.startTime, saved.endTime)}, ngày ${formatDisplayDate(saved.startTime)}.`)
    setEditing(null)
    setActionError('')
    const savedDay = saved.startTime.slice(0, 10)
    if (savedDay === date) {
      reload()
    } else {
      setDate(savedDay)
      setDateText(formatDisplayDate(savedDay))
      setState({ status: 'loading' })
    }
  }

  async function handleCancel(booking: Booking) {
    setActionError('')
    try {
      await cancelBooking(booking.id)
      reload()
    } catch (err) {
      if (!isUnauthorized(err)) {
        setActionError(bookingErrorMessage(err))
        if (isStaleError(err)) {
          reload()
        }
      }
    }
  }

  function retry() {
    setState({ status: 'loading' })
    reload()
  }

  return (
    <section className="schedule">
      <div className="schedule-head">
        <button className="button button-outline" type="button" onClick={onBack}>
          ← Danh sách phòng
        </button>
        <h2 className="heading">{room.name}</h2>
        <p className="muted">Sức chứa {room.capacity} người</p>
      </div>

      <div className="schedule-toolbar">
        <DateInput label="Ngày" value={dateText} onChange={handleDateChange} />
        {!room.active && <span className="muted">Phòng đang ngưng hoạt động, không thể đặt.</span>}
        <button
          className="button button-primary"
          type="button"
          onClick={() => setEditing('new')}
          disabled={!room.active}
        >
          Đặt phòng
        </button>
      </div>

      {actionError && (
        <ErrorDialog title="Hủy lượt đặt không thành công" message={actionError} onClose={() => setActionError('')} />
      )}

      {notice && <p className="notice" role="status">{notice}</p>}

      <div className={editing ? 'layout' : 'layout layout-single'}>
        <div className="layout-main">
          {!date ? (
            <p className="muted">Nhập ngày theo định dạng dd/MM/yyyy.</p>
          ) : state.status === 'loading' ? (
            <p className="muted" role="status">Đang tải lịch…</p>
          ) : state.status === 'error' ? (
            <div className="card">
              <p className="error" role="alert">{state.message}</p>
              <button className="button button-outline" type="button" onClick={retry}>
                Thử lại
              </button>
            </div>
          ) : state.bookings.length === 0 ? (
            <p className="muted">Chưa có lượt đặt nào trong ngày.</p>
          ) : (
            <ul className="booking-list">
              {state.bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  session={session}
                  onEdit={(b) => setEditing(b)}
                  onCancel={handleCancel}
                />
              ))}
            </ul>
          )}
        </div>
        {editing && (
          <aside className="layout-side">
            <BookingForm
              key={editing === 'new' ? 'new' : editing.id}
              room={room}
              booking={editing === 'new' ? undefined : editing}
              defaultDate={dateText}
              onSaved={handleSaved}
              onClose={() => setEditing(null)}
              onStale={reload}
            />
          </aside>
        )}
      </div>
    </section>
  )
}

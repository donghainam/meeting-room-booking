import { useEffect, useState } from 'react'
import { listSchedule } from '../api/bookings'
import { ApiError } from '../api/client'
import { listRooms } from '../api/rooms'
import { bookingErrorMessage } from '../errors'
import { formatDisplayDate, formatRange, parseDisplayDate, todayInHcm } from '../time'
import type { Booking, Room, Session } from '../types'
import DateInput from './DateInput'

interface Props {
  session: Session
  // Mở lịch chi tiết của phòng (để sửa/hủy/đặt) tại đúng ngày đang xem
  onOpenRoom: (room: Room, date: string) => void
}

interface RoomBookings {
  room: Room
  bookings: Booking[]
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; groups: RoomBookings[] }

// SRS không có API "tất cả lượt đặt", nên ghép từ A2 (danh sách phòng) + A6 (lịch từng phòng) của một ngày
export default function BookingsOverview({ session, onOpenRoom }: Props) {
  const [date, setDate] = useState(() => todayInHcm())
  const [dateText, setDateText] = useState(() => formatDisplayDate(todayInHcm()))
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!date) {
      return
    }
    let cancelled = false
    listRooms()
      .then((rooms) =>
        Promise.all(rooms.map(async (room) => ({ room, bookings: await listSchedule(room.id, date) }))),
      )
      .then((groups) => {
        if (!cancelled) {
          setState({ status: 'ready', groups })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? bookingErrorMessage(err) : 'Không tải được lịch đặt.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [date, attempt])

  function handleDateChange(text: string) {
    setDateText(text)
    const parsed = parseDisplayDate(text)
    if (parsed === date) {
      return
    }
    setDate(parsed ?? '')
    // Đang gõ dở thì giữ nguyên danh sách cũ; chỉ khi ngày hợp lệ mới tải ngày mới
    if (parsed) {
      setState({ status: 'loading' })
    }
  }

  function retry() {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  const username = session.username.toLowerCase()
  const visible =
    state.status === 'ready'
      ? state.groups
          .map(({ room, bookings }) => ({
            room,
            bookings: mineOnly ? bookings.filter((b) => b.organizer.toLowerCase() === username) : bookings,
          }))
          .filter(({ bookings }) => bookings.length > 0)
      : []
  const bookingCount = visible.reduce((sum, group) => sum + group.bookings.length, 0)

  return (
    <section className="schedule">
      <div className="schedule-toolbar">
        <DateInput label="Ngày" value={dateText} onChange={handleDateChange} />
        <label className="checkbox">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          <span>Chỉ lượt đặt của tôi</span>
        </label>
      </div>

      {!date ? (
        <p className="muted">Nhập ngày theo định dạng dd/MM/yyyy.</p>
      ) : state.status === 'loading' ? (
        <p className="muted" role="status">Đang tải lịch đặt…</p>
      ) : state.status === 'error' ? (
        <div className="card">
          <p className="error" role="alert">{state.message}</p>
          <button className="button button-outline" type="button" onClick={retry}>
            Thử lại
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="muted">Không có phòng nào được đặt trong ngày.</p>
      ) : (
        <>
          <p className="muted">
            {visible.length} phòng có lịch · {bookingCount} lượt đặt
          </p>
          <ul className="overview-list">
            {visible.map(({ room, bookings }) => (
              <li className="card" key={room.id}>
                <div className="overview-room-head">
                  <h3 className="card-title">{room.name}</h3>
                  <span className="muted">Sức chứa {room.capacity} người</span>
                  <button className="button button-outline" type="button" onClick={() => onOpenRoom(room, date)}>
                    Xem lịch
                  </button>
                </div>
                <ul className="booking-list">
                  {bookings.map((booking) => (
                    <li className="booking-row" key={booking.id}>
                      <div className="booking-time">{formatRange(booking.startTime, booking.endTime)}</div>
                      <div className="booking-info">
                        <span className="booking-title">{booking.title}</span>
                        <span className="muted">
                          {booking.organizer} · {booking.attendees} người
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

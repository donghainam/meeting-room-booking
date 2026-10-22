import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { listRooms } from '../api/rooms'
import type { Room } from '../types'

interface Props {
  // Đổi giá trị này để tải lại danh sách (sau khi tạo phòng)
  reloadKey: number
  onSelectRoom: (room: Room) => void
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rooms: Room[] }

export default function RoomList({ reloadKey, onSelectRoom }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listRooms()
      .then((rooms) => {
        if (!cancelled) {
          setState({ status: 'ready', rooms })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Không tải được danh sách phòng.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey, attempt])

  function retry() {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  if (state.status === 'loading') {
    return <p className="muted" role="status">Đang tải danh sách phòng…</p>
  }
  if (state.status === 'error') {
    return (
      <div className="card">
        <p className="error" role="alert">{state.message}</p>
        <button className="button button-outline" type="button" onClick={retry}>
          Thử lại
        </button>
      </div>
    )
  }
  if (state.rooms.length === 0) {
    return <p className="muted">Chưa có phòng nào.</p>
  }
  return (
    <ul className="room-grid">
      {state.rooms.map((room) => (
        <li className="card room" key={room.id}>
          <h3 className="card-title">{room.name}</h3>
          <p className="muted">Sức chứa: {room.capacity} người</p>
          <span className="badge">{room.active ? 'Đang hoạt động' : 'Ngưng hoạt động'}</span>
          <button className="button button-outline" type="button" onClick={() => onSelectRoom(room)}>
            Xem lịch
          </button>
        </li>
      ))}
    </ul>
  )
}

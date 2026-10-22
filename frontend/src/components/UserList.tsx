import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { listUsers } from '../api/users'
import { userErrorMessage } from '../errors'
import type { User } from '../types'

interface Props {
  // Đổi giá trị này để tải lại danh sách (sau khi tạo user)
  reloadKey: number
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: User[] }

export default function UserList({ reloadKey }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listUsers()
      .then((users) => {
        if (!cancelled) {
          setState({ status: 'ready', users })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? userErrorMessage(err) : 'Không tải được danh sách người dùng.',
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
    return <p className="muted" role="status">Đang tải danh sách người dùng…</p>
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
  return (
    <ul className="booking-list">
      {state.users.map((user) => (
        <li className="booking-row" key={user.id}>
          <div className="booking-time">{user.username}</div>
          <span className="badge">{user.role}</span>
        </li>
      ))}
    </ul>
  )
}

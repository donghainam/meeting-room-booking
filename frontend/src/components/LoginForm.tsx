import { useState, type FormEvent } from 'react'
import { login } from '../api/auth'
import { ApiError } from '../api/client'
import type { Session } from '../types'

interface Props {
  notice?: string
  onLoggedIn: (session: Session) => void
}

export default function LoginForm({ notice, onLoggedIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      onLoggedIn(await login(username, password))
    } catch (err) {
      // Mã 80 không cho biết sai username hay password (SRS U0), nên chỉ hiện một thông báo chung
      if (err instanceof ApiError && err.code === '80') {
        setError('Sai tên đăng nhập hoặc mật khẩu.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.')
      }
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="heading">Đăng nhập</h2>
      {notice && <p className="notice" role="status">{notice}</p>}
      <label className="field">
        <span>Tên đăng nhập</span>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
      </label>
      <label className="field">
        <span>Mật khẩu</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={submitting}>
        {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  )
}

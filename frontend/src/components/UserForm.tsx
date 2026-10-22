import { useState, type FormEvent } from 'react'
import { createUser } from '../api/users'
import { isUnauthorized, userErrorMessage } from '../errors'
import type { Role } from '../types'
import { validateUser, type UserFormErrors } from '../validation'
import ErrorDialog from './ErrorDialog'

interface Props {
  onCreated: () => void
}

export default function UserForm({ onCreated }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('USER')
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [failure, setFailure] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setFailure('')
    const found = validateUser({ username, password })
    setErrors(found)
    if (found.username || found.password) {
      return
    }
    setSubmitting(true)
    try {
      await createUser({ username: username.trim(), password, role })
      setUsername('')
      setPassword('')
      setRole('USER')
      onCreated()
    } catch (err) {
      if (!isUnauthorized(err)) {
        setFailure(userErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="heading">Tạo người dùng</h2>
      <label className="field">
        <span>Tên đăng nhập</span>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          aria-invalid={!!errors.username}
        />
        {errors.username && <span className="error" role="alert">{errors.username}</span>}
      </label>
      <label className="field">
        <span>Mật khẩu</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
        />
        {errors.password && <span className="error" role="alert">{errors.password}</span>}
      </label>
      <label className="field">
        <span>Vai trò</span>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>
      <button className="button button-primary" type="submit" disabled={submitting}>
        {submitting ? 'Đang tạo…' : 'Tạo người dùng'}
      </button>
      {failure && (
        <ErrorDialog title="Tạo người dùng không thành công" message={failure} onClose={() => setFailure('')} />
      )}
    </form>
  )
}

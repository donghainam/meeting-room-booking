import { useState, type FormEvent } from 'react'
import { createRoom } from '../api/rooms'
import { isUnauthorized, roomErrorMessage } from '../errors'
import { validateRoom, type RoomFormErrors } from '../validation'
import ErrorDialog from './ErrorDialog'

interface Props {
  onCreated: () => void
}

export default function RoomForm({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [errors, setErrors] = useState<RoomFormErrors>({})
  const [failure, setFailure] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setFailure('')
    const found = validateRoom(name, capacity)
    setErrors(found)
    if (found.name || found.capacity) {
      return
    }
    setSubmitting(true)
    try {
      await createRoom({ name: name.trim(), capacity: Number(capacity) })
      setName('')
      setCapacity('')
      onCreated()
    } catch (err) {
      if (!isUnauthorized(err)) {
        setFailure(roomErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="heading">Tạo phòng</h2>
      <label className="field">
        <span>Tên phòng</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
        {errors.name && <span className="error" role="alert">{errors.name}</span>}
      </label>
      <label className="field">
        <span>Sức chứa (1–100)</span>
        <input
          className="input"
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          aria-invalid={!!errors.capacity}
        />
        {errors.capacity && <span className="error" role="alert">{errors.capacity}</span>}
      </label>
      <button className="button button-primary" type="submit" disabled={submitting}>
        {submitting ? 'Đang tạo…' : 'Tạo phòng'}
      </button>
      {failure && <ErrorDialog title="Tạo phòng không thành công" message={failure} onClose={() => setFailure('')} />}
    </form>
  )
}

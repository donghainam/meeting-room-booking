import { useEffect } from 'react'

interface Props {
  title: string
  message: string
  onClose: () => void
}

// Popup chặn thao tác cho tới khi người dùng đóng, để lỗi từ server không thể bị bỏ sót
export default function ErrorDialog({ title, message, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-overlay">
      <div className="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="error-dialog-title" aria-describedby="error-dialog-message">
        <h2 className="heading" id="error-dialog-title">{title}</h2>
        <p id="error-dialog-message">
          <span className="muted">Lý do: </span>
          {message}
        </p>
        <button className="button button-primary" type="button" onClick={onClose} autoFocus>
          Đóng
        </button>
      </div>
    </div>
  )
}

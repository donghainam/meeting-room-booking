import type { Role, Session } from '../types'

export type View = 'rooms' | 'bookings' | 'users'

interface Props {
  session: Session
  view: View
  onNavigate: (view: View) => void
  onLogout: () => void
}

const TABS: Array<{ view: View; label: string; roles: Role[] }> = [
  { view: 'rooms', label: 'Phòng', roles: ['ADMIN', 'USER'] },
  { view: 'bookings', label: 'Lịch đặt', roles: ['ADMIN', 'USER'] },
  { view: 'users', label: 'Người dùng', roles: ['ADMIN'] },
]

export default function Header({ session, view, onNavigate, onLogout }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo" aria-label="Meeting Room Booking">w.</span>
        <nav className="topbar-nav" aria-label="Điều hướng">
          {TABS.filter((tab) => tab.roles.includes(session.role)).map((tab) => (
            <button
              key={tab.view}
              className={view === tab.view ? 'nav-link nav-link-active' : 'nav-link'}
              type="button"
              aria-current={view === tab.view ? 'page' : undefined}
              onClick={() => onNavigate(tab.view)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="topbar-user">
        <span>
          {session.username} <span className="badge">{session.role}</span>
        </span>
        <button className="button button-outline" type="button" onClick={onLogout}>
          Đăng xuất
        </button>
      </div>
    </header>
  )
}

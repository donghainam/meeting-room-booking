import { useEffect, useState } from 'react'
import { setUnauthorizedHandler } from './api/client'
import { clearSession, loadSession } from './auth/session'
import BookingsOverview from './components/BookingsOverview'
import Header, { type View } from './components/Header'
import LoginForm from './components/LoginForm'
import RoomForm from './components/RoomForm'
import RoomList from './components/RoomList'
import RoomSchedule from './components/RoomSchedule'
import UserForm from './components/UserForm'
import UserList from './components/UserList'
import type { Room, Session } from './types'

const EXPIRED_NOTICE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [view, setView] = useState<View>('rooms')
  // Ngày (yyyy-MM-dd) mở sẵn khi vào lịch phòng từ màn Lịch đặt; không có thì lịch mở ở hôm nay
  const [scheduleDate, setScheduleDate] = useState<string | undefined>()
  const [userReloadKey, setUserReloadKey] = useState(0)

  // Server trả 80 trên API có token: client.ts đã xóa session, ở đây chỉ đưa UI về màn đăng nhập
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice(EXPIRED_NOTICE)
      setSession(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Token hết hạn theo giờ client thì về màn đăng nhập mà không cần chờ request kế tiếp
  useEffect(() => {
    if (!session) {
      return
    }
    const timer = window.setTimeout(() => {
      clearSession()
      setNotice(EXPIRED_NOTICE)
      setSession(null)
    }, Math.max(session.expiresAt - Date.now(), 0))
    return () => window.clearTimeout(timer)
  }, [session])

  function handleLoggedIn(next: Session) {
    setNotice('')
    setSelectedRoom(null)
    setView('rooms')
    setSession(next)
  }

  function handleLogout() {
    clearSession()
    setNotice('')
    setSession(null)
  }

  function handleNavigate(next: View) {
    setView(next)
    setSelectedRoom(null)
    setScheduleDate(undefined)
  }

  function handleOpenRoom(room: Room, date: string) {
    setView('rooms')
    setSelectedRoom(room)
    setScheduleDate(date)
  }

  if (!session) {
    return (
      <main className="page">
        <section className="hero">
          <h1 className="display">Meeting Rooms</h1>
        </section>
        <div className="content content-narrow">
          <LoginForm notice={notice} onLoggedIn={handleLoggedIn} />
        </div>
      </main>
    )
  }

  return (
    <>
      <Header session={session} view={view} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="page">
        <section className="hero">
          <h1 className="display">
            {view === 'users' ? 'Users' : view === 'bookings' ? 'Bookings' : selectedRoom ? 'Schedule' : 'Rooms'}
          </h1>
        </section>
        <div className="content">
          {view === 'users' && session.role === 'ADMIN' ? (
            <div className="layout">
              <div className="layout-main">
                <UserList reloadKey={userReloadKey} />
              </div>
              <aside className="layout-side">
                <UserForm onCreated={() => setUserReloadKey((n) => n + 1)} />
              </aside>
            </div>
          ) : view === 'bookings' ? (
            <BookingsOverview session={session} onOpenRoom={handleOpenRoom} />
          ) : selectedRoom ? (
            <RoomSchedule
              room={selectedRoom}
              session={session}
              initialDate={scheduleDate}
              onBack={() => {
                setSelectedRoom(null)
                setScheduleDate(undefined)
              }}
            />
          ) : (
            <div className={session.role === 'ADMIN' ? 'layout' : 'layout layout-single'}>
              <div className="layout-main">
                <RoomList reloadKey={reloadKey} onSelectRoom={setSelectedRoom} />
              </div>
              {session.role === 'ADMIN' && (
                <aside className="layout-side">
                  <RoomForm onCreated={() => setReloadKey((n) => n + 1)} />
                </aside>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

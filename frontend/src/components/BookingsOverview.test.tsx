import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { todayInHcm } from '../time'
import type { Booking, Room, Session } from '../types'
import BookingsOverview from './BookingsOverview'

vi.mock('../api/bookings', () => ({
  listSchedule: vi.fn(),
  cancelBooking: vi.fn(),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
}))
vi.mock('../api/rooms', () => ({ listRooms: vi.fn(), createRoom: vi.fn() }))
import { listSchedule } from '../api/bookings'
import { listRooms } from '../api/rooms'

const roomA: Room = { id: 1, name: 'Room A', capacity: 10, active: true }
const roomB: Room = { id: 2, name: 'Room B', capacity: 6, active: true }
const roomC: Room = { id: 3, name: 'Room C', capacity: 20, active: false }
const bob: Session = { token: 't', username: 'bob', role: 'USER', expiresAt: Date.now() + 1_000_000 }

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 1,
    roomId: 1,
    title: 'Họp',
    organizer: 'bob',
    attendees: 3,
    startTime: '2099-01-01T09:00:00',
    endTime: '2099-01-01T10:00:00',
    status: 'BOOKED',
    ...overrides,
  }
}

// Room A: 2 lượt (bob, alice); Room B: không có; Room C: 1 lượt (alice)
function mockSchedules() {
  vi.mocked(listRooms).mockResolvedValue([roomA, roomB, roomC])
  vi.mocked(listSchedule).mockImplementation(async (roomId) => {
    if (roomId === 1) {
      return [
        booking({ id: 1, roomId: 1, title: 'Họp của bob', organizer: 'bob' }),
        booking({ id: 2, roomId: 1, title: 'Họp của alice', organizer: 'alice', startTime: '2099-01-01T14:00:00', endTime: '2099-01-01T15:30:00' }),
      ]
    }
    if (roomId === 3) {
      return [booking({ id: 3, roomId: 3, title: 'Training của alice', organizer: 'alice', startTime: '2099-01-01T08:00:00', endTime: '2099-01-01T09:00:00' })]
    }
    return []
  })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('BookingsOverview', () => {
  it('liệt kê các phòng có lịch kèm giờ, tiêu đề, người đặt; ẩn phòng không có lượt nào', async () => {
    mockSchedules()
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)

    expect(await screen.findByText('Họp của bob')).toBeDefined()
    expect(screen.getByText('09:00 – 10:00')).toBeDefined()
    expect(screen.getByText('14:00 – 15:30')).toBeDefined()
    expect(screen.getByText('Training của alice')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Room A' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Room C' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Room B' })).toBeNull()
    expect(screen.getByText('2 phòng có lịch · 3 lượt đặt')).toBeDefined()
  })

  it('tải lịch của từng phòng theo ngày hôm nay (giờ HCM)', async () => {
    mockSchedules()
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)
    await screen.findByText('Họp của bob')

    expect(listSchedule).toHaveBeenCalledTimes(3)
    for (const room of [roomA, roomB, roomC]) {
      expect(listSchedule).toHaveBeenCalledWith(room.id, todayInHcm())
    }
  })

  it('không có lượt nào thì báo trống', async () => {
    vi.mocked(listRooms).mockResolvedValue([roomA])
    vi.mocked(listSchedule).mockResolvedValue([])
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)

    expect(await screen.findByText('Không có phòng nào được đặt trong ngày.')).toBeDefined()
  })

  it('"Chỉ lượt đặt của tôi" giữ lại lượt của mình và ẩn phòng không còn lượt nào', async () => {
    mockSchedules()
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)
    await screen.findByText('Họp của bob')

    fireEvent.click(screen.getByLabelText('Chỉ lượt đặt của tôi'))

    expect(screen.getByText('Họp của bob')).toBeDefined()
    expect(screen.queryByText('Họp của alice')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Room C' })).toBeNull()
    expect(screen.getByText('1 phòng có lịch · 1 lượt đặt')).toBeDefined()
  })

  it('đổi ngày gõ tự do (3 2 2099) thì tải lại đúng ngày 2099-02-03', async () => {
    mockSchedules()
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)
    await screen.findByText('Họp của bob')
    vi.mocked(listSchedule).mockClear()

    fireEvent.change(screen.getByLabelText('Ngày', { exact: true }), { target: { value: '3 2 2099' } })

    await waitFor(() => expect(listSchedule).toHaveBeenCalledWith(1, '2099-02-03'))
  })

  it('bấm Xem lịch mở phòng đó tại đúng ngày đang xem', async () => {
    mockSchedules()
    const onOpenRoom = vi.fn()
    render(<BookingsOverview session={bob} onOpenRoom={onOpenRoom} />)
    const heading = await screen.findByRole('heading', { name: 'Room C' })

    fireEvent.click(within(heading.closest('li')!).getByRole('button', { name: 'Xem lịch' }))

    expect(onOpenRoom).toHaveBeenCalledWith(roomC, todayInHcm())
  })

  it('lỗi thì hiện thông báo và thử lại được', async () => {
    vi.mocked(listRooms).mockRejectedValueOnce(new ApiError('99', 'System error'))
    render(<BookingsOverview session={bob} onOpenRoom={vi.fn()} />)

    expect((await screen.findByRole('alert')).textContent).toBe('Hệ thống đang gặp lỗi. Vui lòng thử lại sau.')
    mockSchedules()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Họp của bob')).toBeDefined()
  })
})

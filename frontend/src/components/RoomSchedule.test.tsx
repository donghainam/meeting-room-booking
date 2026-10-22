import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { todayInHcm } from '../time'
import type { Booking, Room, Session } from '../types'
import RoomSchedule from './RoomSchedule'

vi.mock('../api/bookings', () => ({
  listSchedule: vi.fn(),
  cancelBooking: vi.fn(),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
}))
import { cancelBooking, createBooking, listSchedule } from '../api/bookings'

const room: Room = { id: 7, name: 'Room A', capacity: 10, active: true }
const bob: Session = { token: 't', username: 'bob', role: 'USER', expiresAt: Date.now() + 1_000_000 }
const admin: Session = { token: 't', username: 'admin', role: 'ADMIN', expiresAt: Date.now() + 1_000_000 }

// Năm 2099 luôn là tương lai, năm 2000 luôn đã bắt đầu, nên test không phụ thuộc giờ chạy
function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 1,
    roomId: 7,
    title: 'Họp',
    organizer: 'bob',
    attendees: 3,
    startTime: '2099-01-01T09:00:00',
    endTime: '2099-01-01T10:00:00',
    status: 'BOOKED',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSchedule(session: Session, r: Room = room) {
  return render(<RoomSchedule room={r} session={session} onBack={vi.fn()} />)
}

describe('RoomSchedule: tải lịch (A6)', () => {
  it('tải theo phòng và ngày hôm nay theo giờ HCM', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    renderSchedule(bob)

    expect(await screen.findByText('Chưa có lượt đặt nào trong ngày.')).toBeDefined()
    expect(listSchedule).toHaveBeenCalledWith(7, todayInHcm())
  })

  it('đổi ngày thì tải lại với ngày mới', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    renderSchedule(bob)
    await screen.findByText('Chưa có lượt đặt nào trong ngày.')

    fireEvent.change(screen.getByLabelText('Ngày'), { target: { value: '03/02/2099' } })

    await waitFor(() => expect(listSchedule).toHaveBeenLastCalledWith(7, '2099-02-03'))
  })

  it('ô ngày hiện dd/MM/yyyy; đang gõ dở thì chưa gọi API, gõ đủ mới tải', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    renderSchedule(bob)
    await screen.findByText('Chưa có lượt đặt nào trong ngày.')
    const [year, month, day] = todayInHcm().split('-')
    expect((screen.getByLabelText('Ngày') as HTMLInputElement).value).toBe(`${day}/${month}/${year}`)
    vi.mocked(listSchedule).mockClear()

    fireEvent.change(screen.getByLabelText('Ngày'), { target: { value: '03/02/20' } })
    expect(listSchedule).not.toHaveBeenCalled()
    expect(screen.getByText('Nhập ngày theo định dạng dd/MM/yyyy.')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Ngày'), { target: { value: '03/02/2099' } })
    await waitFor(() => expect(listSchedule).toHaveBeenCalledWith(7, '2099-02-03'))
  })

  it('lỗi thì hiện thông báo và thử lại được', async () => {
    vi.mocked(listSchedule).mockRejectedValueOnce(new ApiError('91', 'Resource not found'))
    vi.mocked(listSchedule).mockResolvedValueOnce([booking({ title: 'Họp sau khi thử lại' })])
    renderSchedule(bob)

    expect((await screen.findByRole('alert')).textContent).toBe('Không tìm thấy phòng hoặc lượt đặt.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Họp sau khi thử lại')).toBeDefined()
  })

  it('phòng ngưng hoạt động thì khóa nút Đặt phòng', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    renderSchedule(bob, { ...room, active: false })

    await screen.findByText('Chưa có lượt đặt nào trong ngày.')
    expect((screen.getByRole('button', { name: 'Đặt phòng' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('RoomSchedule: nút Sửa/Hủy (gợi ý cho BR7, BR8)', () => {
  it('USER chỉ thấy Sửa/Hủy trên lượt của chính mình', async () => {
    vi.mocked(listSchedule).mockResolvedValue([
      booking({ id: 1, title: 'Của bob', organizer: 'bob' }),
      booking({ id: 2, title: 'Của alice', organizer: 'alice' }),
    ])
    renderSchedule(bob)

    await screen.findByText('Của alice')
    expect(screen.getAllByRole('button', { name: 'Sửa' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Hủy' })).toHaveLength(1)
  })

  it('ADMIN thấy Sửa/Hủy trên mọi lượt chưa bắt đầu', async () => {
    vi.mocked(listSchedule).mockResolvedValue([
      booking({ id: 1, organizer: 'bob' }),
      booking({ id: 2, organizer: 'alice' }),
    ])
    renderSchedule(admin)

    await screen.findAllByText(/người/)
    expect(screen.getAllByRole('button', { name: 'Sửa' })).toHaveLength(2)
  })

  it('lượt đã bắt đầu thì không ai thấy Sửa/Hủy, kể cả chủ lượt và ADMIN', async () => {
    vi.mocked(listSchedule).mockResolvedValue([
      booking({ organizer: 'admin', startTime: '2000-01-01T09:00:00', endTime: '2000-01-01T10:00:00' }),
    ])
    renderSchedule(admin)

    await screen.findByText('Họp')
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Hủy' })).toBeNull()
  })
})

describe('RoomSchedule: hủy (A5)', () => {
  it('cần bấm xác nhận mới gọi API, rồi tải lại lịch', async () => {
    vi.mocked(listSchedule).mockResolvedValue([booking({ id: 5 })])
    vi.mocked(cancelBooking).mockResolvedValue(booking({ id: 5, status: 'CANCELLED' }))
    renderSchedule(bob)
    await screen.findByText('Họp')

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(cancelBooking).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Chắc chắn hủy?' }))

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith(5))
    await waitFor(() => expect(listSchedule).toHaveBeenCalledTimes(2))
  })

  it('"Giữ lại" thì không hủy', async () => {
    vi.mocked(listSchedule).mockResolvedValue([booking({ id: 5 })])
    renderSchedule(bob)
    await screen.findByText('Họp')

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Giữ lại' }))

    expect(cancelBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDefined()
  })

  it('mã 97 báo không thể thay đổi và tải lại lịch', async () => {
    vi.mocked(listSchedule).mockResolvedValue([booking({ id: 5 })])
    vi.mocked(cancelBooking).mockRejectedValue(new ApiError('97', 'Booking can no longer be modified'))
    renderSchedule(bob)
    await screen.findByText('Họp')

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chắc chắn hủy?' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Hủy lượt đặt không thành công')
    expect(dialog.textContent).toContain('Lượt đặt đã bắt đầu hoặc đã bị hủy nên không thể thay đổi.')
    await waitFor(() => expect(listSchedule).toHaveBeenCalledTimes(2))
  })

  it('mã 92 báo không có quyền', async () => {
    vi.mocked(listSchedule).mockResolvedValue([booking({ id: 5 })])
    vi.mocked(cancelBooking).mockRejectedValue(new ApiError('92', 'Permission denied'))
    renderSchedule(bob)
    await screen.findByText('Họp')

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chắc chắn hủy?' }))

    expect((await screen.findByRole('alertdialog')).textContent).toContain('Bạn không có quyền thực hiện thao tác này.')
  })
})

describe('RoomSchedule: đặt phòng xong phải thấy lượt vừa đặt (A3)', () => {
  function fillForm(startDate: string, endDate: string) {
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Họp ngày khác' } })
    fireEvent.change(screen.getByLabelText('Số người'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu', { exact: true }), { target: { value: startDate } })
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Ngày kết thúc', { exact: true }), { target: { value: endDate } })
    fireEvent.change(screen.getByLabelText('Giờ kết thúc'), { target: { value: '1030' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Đặt phòng' }).at(-1)!)
  }

  it('form đặt mới được điền sẵn ngày đang xem', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    renderSchedule(bob)
    await screen.findByText('Chưa có lượt đặt nào trong ngày.')

    fireEvent.click(screen.getByRole('button', { name: 'Đặt phòng' }))

    const [year, month, day] = todayInHcm().split('-')
    expect((screen.getByLabelText('Ngày bắt đầu', { exact: true }) as HTMLInputElement).value).toBe(`${day}/${month}/${year}`)
    expect((screen.getByLabelText('Ngày kết thúc', { exact: true }) as HTMLInputElement).value).toBe(`${day}/${month}/${year}`)
  })

  it('đặt sang ngày khác ngày đang xem thì lịch chuyển sang ngày đó và báo đã đặt', async () => {
    const saved = booking({ id: 9, title: 'Họp ngày khác', startTime: '2099-05-06T09:00:00', endTime: '2099-05-06T10:30:00' })
    vi.mocked(listSchedule).mockImplementation(async (_roomId, date) => (date === '2099-05-06' ? [saved] : []))
    vi.mocked(createBooking).mockResolvedValue(saved)
    renderSchedule(bob)
    await screen.findByText('Chưa có lượt đặt nào trong ngày.')

    fireEvent.click(screen.getByRole('button', { name: 'Đặt phòng' }))
    fillForm('06/05/2099', '06/05/2099')

    expect(await screen.findByText('09:00 – 10:30')).toBeDefined()
    expect(listSchedule).toHaveBeenLastCalledWith(7, '2099-05-06')
    expect((screen.getByLabelText('Ngày', { exact: true }) as HTMLInputElement).value).toBe('06/05/2099')
    expect(screen.getByRole('status').textContent).toContain('Đã đặt phòng "Họp ngày khác" lúc 09:00 – 10:30, ngày 06/05/2099.')
  })

  it('đặt đúng ngày đang xem thì tải lại ngày đó và báo đã đặt', async () => {
    const [year, month, day] = todayInHcm().split('-')
    const today = `${year}-${month}-${day}`
    const saved = booking({ id: 10, title: 'Họp hôm nay', startTime: `${today}T23:00:00`, endTime: `${today}T23:30:00` })
    vi.mocked(listSchedule).mockResolvedValueOnce([]).mockResolvedValue([saved])
    vi.mocked(createBooking).mockResolvedValue(saved)
    renderSchedule(bob)
    await screen.findByText('Chưa có lượt đặt nào trong ngày.')

    fireEvent.click(screen.getByRole('button', { name: 'Đặt phòng' }))
    fillForm(`${day}/${month}/${year}`, `${day}/${month}/${year}`)

    expect(await screen.findByText('23:00 – 23:30')).toBeDefined()
    expect(listSchedule).toHaveBeenCalledTimes(2)
  })
})

describe('RoomSchedule: ngày mở sẵn từ màn Lịch đặt', () => {
  it('có initialDate thì mở và tải đúng ngày đó thay vì hôm nay', async () => {
    vi.mocked(listSchedule).mockResolvedValue([])
    render(<RoomSchedule room={room} session={bob} initialDate="2099-05-06" onBack={vi.fn()} />)

    await screen.findByText('Chưa có lượt đặt nào trong ngày.')
    expect(listSchedule).toHaveBeenCalledWith(7, '2099-05-06')
    expect((screen.getByLabelText('Ngày', { exact: true }) as HTMLInputElement).value).toBe('06/05/2099')
  })
})

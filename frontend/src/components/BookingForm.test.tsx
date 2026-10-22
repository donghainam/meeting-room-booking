import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { Booking, Room } from '../types'
import BookingForm from './BookingForm'

vi.mock('../api/bookings', () => ({
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
  cancelBooking: vi.fn(),
  listSchedule: vi.fn(),
}))
import { createBooking, updateBooking } from '../api/bookings'

const room: Room = { id: 7, name: 'Room A', capacity: 10, active: true }
const existing: Booking = {
  id: 42,
  roomId: 7,
  title: 'Họp cũ',
  organizer: 'bob',
  attendees: 3,
  startTime: '2026-10-22T09:00:00',
  endTime: '2026-10-22T10:00:00',
  status: 'BOOKED',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderForm(booking?: Booking) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn(), onStale: vi.fn() }
  render(<BookingForm room={room} booking={booking} {...handlers} />)
  return handlers
}

// start/end nhận yyyy-MM-ddTHH:mm cho gọn, rồi gõ vào hai ô theo đúng định dạng người dùng thấy: dd/MM/yyyy và HH:mm
function typeDateTime(label: 'bắt đầu' | 'kết thúc', iso: string) {
  fireEvent.change(screen.getByLabelText(`Ngày ${label}`), {
    target: { value: `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` },
  })
  fireEvent.change(screen.getByLabelText(`Giờ ${label}`), { target: { value: iso.slice(11, 16) } })
}

function fill(values: { title?: string; attendees?: string; start?: string; end?: string }) {
  if (values.title !== undefined) fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: values.title } })
  if (values.attendees !== undefined) fireEvent.change(screen.getByLabelText('Số người'), { target: { value: values.attendees } })
  if (values.start !== undefined) typeDateTime('bắt đầu', values.start)
  if (values.end !== undefined) typeDateTime('kết thúc', values.end)
}

function submit(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('BookingForm: đặt mới (A3)', () => {
  it('BR1: giờ kết thúc không sau giờ bắt đầu thì không gọi API', () => {
    renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T10:00', end: '2026-10-22T09:00' })
    submit('Đặt phòng')

    expect(createBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Giờ kết thúc phải sau giờ bắt đầu.')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('gửi giờ có thêm :00 và không có offset, title đã trim, attendees dạng số', async () => {
    vi.mocked(createBooking).mockResolvedValue(existing)
    const { onSaved } = renderForm()

    fill({ title: '  Họp nhóm ', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(createBooking).toHaveBeenCalledWith(7, {
      title: 'Họp nhóm',
      attendees: 5,
      startTime: '2026-10-22T09:00:00',
      endTime: '2026-10-22T10:00:00',
    })
  })

  it('mã 93 báo trùng giờ và yêu cầu cha tải lại lịch', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError('93', 'Room is already booked for this time'))
    const { onStale, onSaved } = renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Đặt phòng không thành công')
    expect(dialog.textContent).toContain('Phòng đã được đặt trong khung giờ này.')
    expect(onStale).toHaveBeenCalledTimes(1)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it.each([
    ['94', 'Giờ bắt đầu phải ở tương lai.'],
    ['95', 'Số người vượt quá sức chứa của phòng.'],
    ['96', 'Phòng hiện không hoạt động.'],
  ])('mã %s hiện đúng thông báo', async (code, message) => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError(code, 'server message'))
    renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Đặt phòng không thành công')
    expect(dialog.textContent).toContain(message)
  })

  it('lỗi hệ thống (99) cũng hiện popup bằng tiếng Việt', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError('99', 'System error. Please try again later'))
    renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')

    expect((await screen.findByRole('alertdialog')).textContent).toContain('Hệ thống đang gặp lỗi. Vui lòng thử lại sau.')
  })

  it('bấm Đóng thì popup biến mất và vẫn giữ nguyên dữ liệu đã nhập', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError('93', 'x'))
    renderForm()

    fill({ title: 'Họp giữ lại', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect((screen.getByLabelText('Tiêu đề') as HTMLInputElement).value).toBe('Họp giữ lại')
  })

  it('phím Escape đóng popup', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError('93', 'x'))
    renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')
    await screen.findByRole('alertdialog')
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('khóa nút khi đang gửi nên bấm đúp chỉ gọi API một lần', async () => {
    let resolve: (value: Booking) => void = () => {}
    vi.mocked(createBooking).mockReturnValue(new Promise<Booking>((r) => (resolve = r)))
    renderForm()

    fill({ title: 'Họp', attendees: '5', start: '2026-10-22T09:00', end: '2026-10-22T10:00' })
    submit('Đặt phòng')
    const pending = await screen.findByRole('button', { name: 'Đang lưu…' })
    fireEvent.click(pending)

    expect(createBooking).toHaveBeenCalledTimes(1)
    expect((pending as HTMLButtonElement).disabled).toBe(true)
    resolve(existing)
  })
})

describe('BookingForm: nhập ngày giờ', () => {
  it('ngày dd/MM/yyyy và giờ 24h được chuyển thành yyyy-MM-ddTHH:mm:ss gửi lên server', async () => {
    vi.mocked(createBooking).mockResolvedValue(existing)
    renderForm()

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Họp chiều' } })
    fireEvent.change(screen.getByLabelText('Số người'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '5/3/2099' } })
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu'), { target: { value: '14:30' } })
    fireEvent.change(screen.getByLabelText('Ngày kết thúc'), { target: { value: '05/03/2099' } })
    fireEvent.change(screen.getByLabelText('Giờ kết thúc'), { target: { value: '16:00' } })
    submit('Đặt phòng')

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith(7, {
        title: 'Họp chiều',
        attendees: 4,
        startTime: '2099-03-05T14:30:00',
        endTime: '2099-03-05T16:00:00',
      }),
    )
  })

  it('gõ tự do 5 3 2099 và 1430 thì hiểu là 05/03/2099 14:30, và viết lại cho chuẩn khi rời ô', async () => {
    vi.mocked(createBooking).mockResolvedValue(existing)
    renderForm()

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Họp' } })
    fireEvent.change(screen.getByLabelText('Số người'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '5 3 2099' } })
    fireEvent.blur(screen.getByLabelText('Ngày bắt đầu'))
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu'), { target: { value: '1430' } })
    fireEvent.blur(screen.getByLabelText('Giờ bắt đầu'))
    expect((screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement).value).toBe('05/03/2099')
    expect((screen.getByLabelText('Giờ bắt đầu') as HTMLInputElement).value).toBe('14:30')

    fireEvent.change(screen.getByLabelText('Ngày kết thúc'), { target: { value: '5 3 2099' } })
    fireEvent.change(screen.getByLabelText('Giờ kết thúc'), { target: { value: '16h' } })
    submit('Đặt phòng')

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith(7, {
        title: 'Họp',
        attendees: 4,
        startTime: '2099-03-05T14:30:00',
        endTime: '2099-03-05T16:00:00',
      }),
    )
  })

  it('có nút mở lịch chọn ngày cho cả ngày bắt đầu và kết thúc', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Chọn ngày bắt đầu từ lịch' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Chọn ngày kết thúc từ lịch' })).toBeDefined()
  })

  it('chọn ngày từ lịch thì điền vào ô theo dd/MM/yyyy', () => {
    const { container } = render(<BookingForm room={room} onSaved={vi.fn()} onClose={vi.fn()} onStale={vi.fn()} />)

    const pickers = container.querySelectorAll<HTMLInputElement>('input[type="date"]')
    fireEvent.change(pickers[0], { target: { value: '2099-03-05' } })

    expect((screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement).value).toBe('05/03/2099')
  })

  it.each([
    ['ngày không có thật 31/02/2099', '31/02/2099', '09:00'],
    ['ngày sai thứ tự 2099-01-01', '2099-01-01', '09:00'],
    ['giờ 24:00', '01/01/2099', '24:00'],
    ['giờ có AM/PM', '01/01/2099', '09:00 AM'],
    ['ngày kiểu ISO', '2099-01-01', '09:00'],
    ['giờ 09:60', '01/01/2099', '09:60'],
  ])('%s thì báo lỗi và không gọi API', (_name, date, clock) => {
    renderForm()

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Họp' } })
    fireEvent.change(screen.getByLabelText('Số người'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: date } })
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu'), { target: { value: clock } })
    typeDateTime('kết thúc', '2099-01-01T10:00')
    submit('Đặt phòng')

    expect(createBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('dd/MM/yyyy và HH:mm (24 giờ)')
  })
})

describe('BookingForm: sửa (A4)', () => {
  it('điền sẵn giá trị cũ và gọi updateBooking theo id', async () => {
    vi.mocked(updateBooking).mockResolvedValue(existing)
    const { onSaved } = renderForm(existing)

    expect((screen.getByLabelText('Tiêu đề') as HTMLInputElement).value).toBe('Họp cũ')
    expect((screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement).value).toBe('22/10/2026')
    expect((screen.getByLabelText('Giờ bắt đầu') as HTMLInputElement).value).toBe('09:00')

    fill({ title: 'Họp mới', end: '2026-10-22T11:00' })
    submit('Lưu thay đổi')

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(updateBooking).toHaveBeenCalledWith(42, {
      title: 'Họp mới',
      attendees: 3,
      startTime: '2026-10-22T09:00:00',
      endTime: '2026-10-22T11:00:00',
    })
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('mã 97 báo không thể thay đổi và yêu cầu tải lại', async () => {
    vi.mocked(updateBooking).mockRejectedValue(new ApiError('97', 'Booking can no longer be modified'))
    const { onStale } = renderForm(existing)

    submit('Lưu thay đổi')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Sửa lượt đặt không thành công')
    expect(dialog.textContent).toContain('Lượt đặt đã bắt đầu hoặc đã bị hủy nên không thể thay đổi.')
    expect(onStale).toHaveBeenCalledTimes(1)
  })
})

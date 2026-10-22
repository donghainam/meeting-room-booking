import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { validateRoom } from '../validation'
import RoomForm from './RoomForm'

vi.mock('../api/rooms', () => ({ createRoom: vi.fn(), listRooms: vi.fn() }))
import { createRoom } from '../api/rooms'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function fill(name: string, capacity: string) {
  fireEvent.change(screen.getByLabelText('Tên phòng'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Sức chứa (1–100)'), { target: { value: capacity } })
  fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }))
}

describe('validateRoom', () => {
  it('chặn tên rỗng, chỉ có khoảng trắng và quá 100 ký tự', () => {
    expect(validateRoom('', '10').name).toBeDefined()
    expect(validateRoom('   ', '10').name).toBeDefined()
    expect(validateRoom('a'.repeat(101), '10').name).toBeDefined()
  })

  it('chấp nhận tên đúng 100 ký tự (sau trim)', () => {
    expect(validateRoom(` ${'a'.repeat(100)} `, '10').name).toBeUndefined()
  })

  it('chỉ nhận capacity nguyên 1–100', () => {
    for (const bad of ['0', '101', '', 'abc', '1.5', '-3']) {
      expect(validateRoom('Room A', bad).capacity, bad).toBeDefined()
    }
    for (const good of ['1', '100', ' 25 ']) {
      expect(validateRoom('Room A', good).capacity, good).toBeUndefined()
    }
  })
})

describe('RoomForm', () => {
  it('không gọi API khi dữ liệu không hợp lệ', () => {
    render(<RoomForm onCreated={vi.fn()} />)

    fill('', '0')

    expect(createRoom).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('gửi name đã trim và capacity dạng số, rồi gọi onCreated', async () => {
    vi.mocked(createRoom).mockResolvedValue({ id: 1, name: 'Room A', capacity: 10, active: true })
    const onCreated = vi.fn()
    render(<RoomForm onCreated={onCreated} />)

    fill('  Room A ', '10')

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(createRoom).toHaveBeenCalledWith({ name: 'Room A', capacity: 10 })
  })

  it('mã 98 hiện popup báo trùng tên và giữ nguyên dữ liệu đã nhập', async () => {
    vi.mocked(createRoom).mockRejectedValue(new ApiError('98', 'Room name already exists'))
    render(<RoomForm onCreated={vi.fn()} />)

    fill('room a', '10')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Tạo phòng không thành công')
    expect(dialog.textContent).toContain('Tên phòng đã tồn tại.')
    expect((screen.getByLabelText('Tên phòng') as HTMLInputElement).value).toBe('room a')
  })

  it('mã 92 hiện popup không có quyền', async () => {
    vi.mocked(createRoom).mockRejectedValue(new ApiError('92', 'Permission denied'))
    render(<RoomForm onCreated={vi.fn()} />)

    fill('Room A', '10')

    expect((await screen.findByRole('alertdialog')).textContent).toContain('Bạn không có quyền tạo phòng.')
  })
})

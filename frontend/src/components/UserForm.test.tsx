import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import UserForm from './UserForm'

vi.mock('../api/users', () => ({ createUser: vi.fn(), listUsers: vi.fn() }))
import { createUser } from '../api/users'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function fill(username: string, password: string, role?: string) {
  fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: password } })
  if (role) {
    fireEvent.change(screen.getByLabelText('Vai trò'), { target: { value: role } })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Tạo người dùng' }))
}

describe('UserForm (U1)', () => {
  it('không gọi API khi username hoặc password sai luật', () => {
    render(<UserForm onCreated={vi.fn()} />)

    fill('ab', 'short')

    expect(createUser).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('mặc định tạo USER, gửi username đã trim, password giữ nguyên, rồi xóa form', async () => {
    vi.mocked(createUser).mockResolvedValue({ id: 2, username: 'bob', role: 'USER' })
    const onCreated = vi.fn()
    render(<UserForm onCreated={onCreated} />)

    fill('  bob ', ' password1 ')

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(createUser).toHaveBeenCalledWith({ username: 'bob', password: ' password1 ', role: 'USER' })
    expect((screen.getByLabelText('Tên đăng nhập') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Mật khẩu') as HTMLInputElement).value).toBe('')
  })

  it('chọn được vai trò ADMIN', async () => {
    vi.mocked(createUser).mockResolvedValue({ id: 3, username: 'boss', role: 'ADMIN' })
    render(<UserForm onCreated={vi.fn()} />)

    fill('boss', 'password1', 'ADMIN')

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({ username: 'boss', password: 'password1', role: 'ADMIN' }),
    )
  })

  it('mã 81 hiện popup trùng tên đăng nhập và giữ nguyên dữ liệu đã nhập', async () => {
    vi.mocked(createUser).mockRejectedValue(new ApiError('81', 'Username already exists'))
    render(<UserForm onCreated={vi.fn()} />)

    fill('Bob', 'password1')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Tạo người dùng không thành công')
    expect(dialog.textContent).toContain('Tên đăng nhập đã tồn tại.')
    expect((screen.getByLabelText('Tên đăng nhập') as HTMLInputElement).value).toBe('Bob')
  })

  it('mã 92 hiện popup không có quyền', async () => {
    vi.mocked(createUser).mockRejectedValue(new ApiError('92', 'Permission denied'))
    render(<UserForm onCreated={vi.fn()} />)

    fill('bob', 'password1')

    expect((await screen.findByRole('alertdialog')).textContent).toContain('Bạn không có quyền quản lý người dùng.')
  })
})

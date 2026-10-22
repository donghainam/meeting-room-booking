import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import UserList from './UserList'

vi.mock('../api/users', () => ({ createUser: vi.fn(), listUsers: vi.fn() }))
import { listUsers } from '../api/users'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserList (U2)', () => {
  it('hiện username và vai trò của từng user', async () => {
    vi.mocked(listUsers).mockResolvedValue([
      { id: 1, username: 'admin', role: 'ADMIN' },
      { id: 2, username: 'bob', role: 'USER' },
    ])
    render(<UserList reloadKey={0} />)

    expect(await screen.findByText('bob')).toBeDefined()
    expect(screen.getByText('admin')).toBeDefined()
    expect(screen.getByText('ADMIN')).toBeDefined()
    expect(screen.getByText('USER')).toBeDefined()
  })

  it('tải lại khi reloadKey đổi', async () => {
    vi.mocked(listUsers).mockResolvedValue([])
    const { rerender } = render(<UserList reloadKey={0} />)
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(1))

    rerender(<UserList reloadKey={1} />)

    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(2))
  })

  it('lỗi thì hiện thông báo và thử lại được', async () => {
    vi.mocked(listUsers).mockRejectedValueOnce(new ApiError('92', 'Permission denied'))
    vi.mocked(listUsers).mockResolvedValueOnce([{ id: 2, username: 'bob', role: 'USER' }])
    render(<UserList reloadKey={0} />)

    expect((await screen.findByRole('alert')).textContent).toBe('Bạn không có quyền quản lý người dùng.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('bob')).toBeDefined()
  })
})

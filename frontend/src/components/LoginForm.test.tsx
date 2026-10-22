import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import LoginForm from './LoginForm'

vi.mock('../api/auth', () => ({ login: vi.fn() }))
import { login } from '../api/auth'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function submit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

describe('LoginForm', () => {
  it('mã 80 chỉ hiện một thông báo chung, không nói sai trường nào', async () => {
    vi.mocked(login).mockRejectedValue(new ApiError('80', 'Unauthorized'))
    render(<LoginForm onLoggedIn={vi.fn()} />)

    submit('admin', 'sai-mat-khau')

    expect((await screen.findByRole('alert')).textContent).toBe('Sai tên đăng nhập hoặc mật khẩu.')
  })

  it('đăng nhập thành công thì gọi onLoggedIn với session', async () => {
    const session = { token: 't', username: 'admin', role: 'ADMIN' as const, expiresAt: 1 }
    vi.mocked(login).mockResolvedValue(session)
    const onLoggedIn = vi.fn()
    render(<LoginForm onLoggedIn={onLoggedIn} />)

    submit('admin', 'admin')

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(session))
  })

  it('hiện thông báo hết phiên khi App truyền notice', () => {
    render(<LoginForm notice="Phiên đăng nhập đã hết hạn." onLoggedIn={vi.fn()} />)

    expect(screen.getByRole('status').textContent).toBe('Phiên đăng nhập đã hết hạn.')
  })
})

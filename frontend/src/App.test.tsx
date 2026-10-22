import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createSession, saveSession } from './auth/session'
import { fakeToken, jsonResponse } from './testUtils'

const fetchMock = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(
    jsonResponse({ code: '00', message: 'Success', data: [{ id: 1, name: 'Room A', capacity: 8, active: true }] }),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('chưa đăng nhập thì chỉ thấy form đăng nhập và không gọi API', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ADMIN thấy form Tạo phòng và danh sách phòng', async () => {
    saveSession(createSession(fakeToken('admin', 'ADMIN'), 3600))
    render(<App />)

    expect(await screen.findByText('Room A')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Tạo phòng' })).toBeDefined()
  })

  it('USER thấy danh sách phòng nhưng không thấy form Tạo phòng', async () => {
    saveSession(createSession(fakeToken('bob', 'USER'), 3600))
    render(<App />)

    expect(await screen.findByText('Room A')).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Tạo phòng' })).toBeNull()
  })

  it('ADMIN thấy tab Người dùng và vào được màn tạo người dùng', async () => {
    saveSession(createSession(fakeToken('admin', 'ADMIN'), 3600))
    render(<App />)
    await screen.findByText('Room A')

    fireEvent.click(screen.getByRole('button', { name: 'Người dùng' }))

    expect(await screen.findByRole('heading', { name: 'Tạo người dùng' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Tạo phòng' })).toBeNull()
  })

  it('cả ADMIN và USER đều có tab Lịch đặt, bấm vào thì thấy màn Lịch đặt', async () => {
    saveSession(createSession(fakeToken('bob', 'USER'), 3600))
    render(<App />)
    await screen.findByText('Room A')

    fireEvent.click(screen.getByRole('button', { name: 'Lịch đặt' }))

    expect(await screen.findByLabelText('Chỉ lượt đặt của tôi')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeDefined()
  })

  it('USER không thấy tab Người dùng', async () => {
    saveSession(createSession(fakeToken('bob', 'USER'), 3600))
    render(<App />)
    await screen.findByText('Room A')

    expect(screen.queryByRole('button', { name: 'Người dùng' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Phòng' })).toBeDefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSession, loadSession, saveSession } from '../auth/session'
import { fakeToken, jsonResponse } from '../testUtils'
import { ApiError, request, setUnauthorizedHandler } from './client'

const fetchMock = vi.fn()

describe('request', () => {
  beforeEach(() => {
    sessionStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    vi.unstubAllGlobals()
  })

  it('bóc data khi code là 00 và gắn Bearer token', async () => {
    saveSession(createSession(fakeToken('admin', 'ADMIN'), 3600))
    fetchMock.mockResolvedValue(jsonResponse({ code: '00', message: 'Success', data: [{ id: 1 }] }))

    await expect(request('/api/rooms')).resolves.toEqual([{ id: 1 }])
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${fakeToken('admin', 'ADMIN')}`)
  })

  it('ném ApiError mang đúng code và message của server (98)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: '98', message: 'Room name already exists' }, 409))

    await expect(request('/api/rooms', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      code: '98',
      message: 'Room name already exists',
    })
  })

  it('body rỗng (404 URL lạ) thành lỗi chung 99, không văng lỗi parse', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }))

    await expect(request('/api/khong-co')).rejects.toMatchObject({ code: '99' })
  })

  it('lỗi mạng thành ApiError 99', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/api/rooms')).rejects.toBeInstanceOf(ApiError)
    await expect(request('/api/rooms')).rejects.toMatchObject({ code: '99' })
  })

  it('mã 80 trên API có token thì xóa session và báo cho App', async () => {
    saveSession(createSession(fakeToken('bob', 'USER'), 3600))
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(jsonResponse({ code: '80', message: 'Unauthorized' }, 401))

    await expect(request('/api/rooms')).rejects.toMatchObject({ code: '80' })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(loadSession()).toBeNull()
  })

  it('mã 80 của đăng nhập (auth=false) không bị coi là hết phiên', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(jsonResponse({ code: '80', message: 'Unauthorized' }, 401))

    await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      code: '80',
    })
    expect(handler).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { fakeToken } from '../testUtils'
import { clearSession, createSession, loadSession, saveSession } from './session'

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('đọc username và role từ payload JWT, hạn tính theo expiresIn', () => {
    const session = createSession(fakeToken('admin', 'ADMIN'), 3600, 1_000)
    expect(session).toEqual({ token: fakeToken('admin', 'ADMIN'), username: 'admin', role: 'ADMIN', expiresAt: 3_601_000 })
  })

  it('từ chối token thiếu role hoặc role lạ', () => {
    expect(() => createSession(fakeToken('bob', 'ROOT'), 3600)).toThrow()
    expect(() => createSession('khong-phai-jwt', 3600)).toThrow()
  })

  it('lưu rồi đọc lại được khi còn hạn', () => {
    const session = createSession(fakeToken('bob', 'USER'), 3600, 1_000)
    saveSession(session)
    expect(loadSession(2_000)).toEqual(session)
  })

  it('trả null và xóa khi đã hết hạn', () => {
    saveSession(createSession(fakeToken('bob', 'USER'), 3600, 1_000))
    expect(loadSession(3_601_000)).toBeNull()
    expect(sessionStorage.getItem('mrb.session')).toBeNull()
  })

  it('trả null khi dữ liệu lưu bị hỏng', () => {
    sessionStorage.setItem('mrb.session', '{khong-phai-json')
    expect(loadSession()).toBeNull()
    clearSession()
  })
})

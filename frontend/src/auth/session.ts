import type { Role, Session } from '../types'

const STORAGE_KEY = 'mrb.session'

function isRole(value: unknown): value is Role {
  return value === 'ADMIN' || value === 'USER'
}

// Chỉ để biết username/role hiển thị UI; không xác thực chữ ký, quyền thật do server kiểm (92)
function decodePayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1]
  if (!part) {
    throw new Error('Malformed token')
  }
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return JSON.parse(atob(padded)) as Record<string, unknown>
}

export function createSession(token: string, expiresInSeconds: number, now = Date.now()): Session {
  const payload = decodePayload(token)
  const username = payload.sub
  const role = payload.role
  if (typeof username !== 'string' || !isRole(role)) {
    throw new Error('Token payload is missing sub or role')
  }
  return { token, username, role, expiresAt: now + expiresInSeconds * 1000 }
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage bị chặn: phiên chỉ sống trong bộ nhớ của lần tải trang này
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // không có gì để xóa
  }
}

export function loadSession(now = Date.now()): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const data = JSON.parse(raw) as Partial<Session>
    if (
      typeof data.token !== 'string' ||
      typeof data.username !== 'string' ||
      !isRole(data.role) ||
      typeof data.expiresAt !== 'number'
    ) {
      clearSession()
      return null
    }
    if (data.expiresAt <= now) {
      clearSession()
      return null
    }
    return { token: data.token, username: data.username, role: data.role, expiresAt: data.expiresAt }
  } catch {
    clearSession()
    return null
  }
}

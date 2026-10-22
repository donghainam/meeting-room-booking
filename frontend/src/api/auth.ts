import { createSession, saveSession } from '../auth/session'
import type { LoginResult, Session } from '../types'
import { request } from './client'

export async function login(username: string, password: string): Promise<Session> {
  const result = await request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { username: username.trim(), password },
    auth: false,
  })
  const session = createSession(result.accessToken, result.expiresIn)
  saveSession(session)
  return session
}

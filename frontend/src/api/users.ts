import type { NewUser, User } from '../types'
import { request } from './client'

// U2 (chỉ ADMIN): sắp theo id tăng dần
export function listUsers(): Promise<User[]> {
  return request<User[]>('/api/users')
}

// U1 (chỉ ADMIN)
export function createUser(input: NewUser): Promise<User> {
  return request<User>('/api/users', { method: 'POST', body: input })
}

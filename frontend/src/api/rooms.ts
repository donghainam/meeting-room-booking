import type { Room } from '../types'
import { request } from './client'

export function listRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms')
}

export function createRoom(input: { name: string; capacity: number }): Promise<Room> {
  return request<Room>('/api/rooms', { method: 'POST', body: input })
}

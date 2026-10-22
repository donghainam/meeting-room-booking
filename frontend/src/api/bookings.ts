import type { Booking, BookingInput } from '../types'
import { request } from './client'

// A6: chỉ trả lượt BOOKED giao với ngày `date` (yyyy-MM-dd), sắp theo startTime
export function listSchedule(roomId: number, date: string): Promise<Booking[]> {
  const query = new URLSearchParams({ roomId: String(roomId), date })
  return request<Booking[]>(`/api/bookings?${query}`)
}

// A3
export function createBooking(roomId: number, input: BookingInput): Promise<Booking> {
  return request<Booking>('/api/bookings', { method: 'POST', body: { roomId, ...input } })
}

// A4: gửi đủ title, attendees, startTime, endTime (thay toàn bộ)
export function updateBooking(id: number, input: BookingInput): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}`, { method: 'PUT', body: input })
}

// A5: không có body
export function cancelBooking(id: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/cancel`, { method: 'POST' })
}

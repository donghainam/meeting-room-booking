export type Role = 'ADMIN' | 'USER'

// Không bao giờ có password trong response (SRS mục 2)
export interface User {
  id: number
  username: string
  role: Role
}

export interface NewUser {
  username: string
  password: string
  role: Role
}

export interface Room {
  id: number
  name: string
  capacity: number
  active: boolean
}

export type BookingStatus = 'BOOKED' | 'CANCELLED'

// startTime/endTime dạng yyyy-MM-ddTHH:mm:ss, không offset (SRS mục 6)
export interface Booking {
  id: number
  roomId: number
  title: string
  organizer: string
  attendees: number
  startTime: string
  endTime: string
  status: BookingStatus
}

// Phần client gửi cho A4; A3 thêm roomId
export interface BookingInput {
  title: string
  attendees: number
  startTime: string
  endTime: string
}

// Khung response của backend (SRS D2); lỗi không có `data`
export interface ApiEnvelope<T> {
  code: string
  message: string
  data?: T
}

export interface LoginResult {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface Session {
  token: string
  username: string
  role: Role
  // epoch ms
  expiresAt: number
}

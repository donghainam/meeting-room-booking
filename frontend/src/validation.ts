import { toMinutes } from './time'

export interface RoomFormErrors {
  name?: string
  capacity?: string
}

// Trùng luật server (SRS mục 2): name sau trim không rỗng và ≤ 100 ký tự, capacity nguyên 1–100
export function validateRoom(name: string, capacity: string): RoomFormErrors {
  const errors: RoomFormErrors = {}
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    errors.name = 'Vui lòng nhập tên phòng.'
  } else if (trimmed.length > 100) {
    errors.name = 'Tên phòng tối đa 100 ký tự.'
  }
  const value = Number(capacity)
  if (!/^\d+$/.test(capacity.trim()) || value < 1 || value > 100) {
    errors.capacity = 'Sức chứa phải là số nguyên từ 1 đến 100.'
  }
  return errors
}

export interface BookingFormValues {
  title: string
  attendees: string
  startTime: string
  endTime: string
}

export interface BookingFormErrors {
  title?: string
  attendees?: string
  startTime?: string
  endTime?: string
}

const MAX_BOOKING_MINUTES = 4 * 60

// Chỉ các luật không cần biết "bây giờ" hay dữ liệu phòng: BR2 (tương lai), BR4 (trùng giờ), BR5 (sức chứa) để server quyết định
export function validateBooking(values: BookingFormValues): BookingFormErrors {
  const errors: BookingFormErrors = {}
  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Vui lòng nhập tiêu đề.'
  } else if (title.length > 200) {
    errors.title = 'Tiêu đề tối đa 200 ký tự.'
  }
  const attendees = values.attendees.trim()
  if (!/^\d+$/.test(attendees) || Number(attendees) < 1) {
    errors.attendees = 'Số người phải là số nguyên từ 1 trở lên.'
  }
  const start = toMinutes(values.startTime)
  const end = toMinutes(values.endTime)
  if (start === null) {
    errors.startTime = 'Nhập giờ bắt đầu theo dd/MM/yyyy và HH:mm (24 giờ).'
  }
  if (end === null) {
    errors.endTime = 'Nhập giờ kết thúc theo dd/MM/yyyy và HH:mm (24 giờ).'
  }
  if (start !== null && end !== null) {
    if (end <= start) {
      errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.'
    } else if (end - start > MAX_BOOKING_MINUTES) {
      errors.endTime = 'Mỗi lượt đặt tối đa 4 giờ.'
    }
  }
  return errors
}

export interface UserFormValues {
  username: string
  password: string
}

export interface UserFormErrors {
  username?: string
  password?: string
}

// Luật SRS mục 2: username 3–50 ký tự chỉ gồm a-z A-Z 0-9 . _ - (server bỏ khoảng trắng đầu/cuối);
// password 8–72 ký tự và không bị trim. Trùng username (81) do server quyết định
export function validateUser(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {}
  const username = values.username.trim()
  if (username.length < 3 || username.length > 50) {
    errors.username = 'Tên đăng nhập phải từ 3 đến 50 ký tự.'
  } else if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    errors.username = 'Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ -'
  }
  if (values.password.length < 8 || values.password.length > 72) {
    errors.password = 'Mật khẩu phải từ 8 đến 72 ký tự.'
  }
  return errors
}

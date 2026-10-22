import { ApiError } from './api/client'

const GENERIC = 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'

// Mã lỗi đặt/sửa/hủy (SRS mục 7). Server quyết định thứ tự kiểm tra; UI chỉ dịch mã nhận được.
const BOOKING_MESSAGES: Record<string, string> = {
  '90': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  '91': 'Không tìm thấy phòng hoặc lượt đặt.',
  '92': 'Bạn không có quyền thực hiện thao tác này.',
  '93': 'Phòng đã được đặt trong khung giờ này.',
  '94': 'Giờ bắt đầu phải ở tương lai.',
  '95': 'Số người vượt quá sức chứa của phòng.',
  '96': 'Phòng hiện không hoạt động.',
  '97': 'Lượt đặt đã bắt đầu hoặc đã bị hủy nên không thể thay đổi.',
  '99': GENERIC,
}

const ROOM_MESSAGES: Record<string, string> = {
  '90': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  '92': 'Bạn không có quyền tạo phòng.',
  '98': 'Tên phòng đã tồn tại.',
  '99': GENERIC,
}

const USER_MESSAGES: Record<string, string> = {
  '81': 'Tên đăng nhập đã tồn tại.',
  '90': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  '92': 'Bạn không có quyền quản lý người dùng.',
  '99': GENERIC,
}

function describe(err: unknown, table: Record<string, string>): string {
  if (err instanceof ApiError) {
    return table[err.code] ?? err.message
  }
  return GENERIC
}

export function bookingErrorMessage(err: unknown): string {
  return describe(err, BOOKING_MESSAGES)
}

export function roomErrorMessage(err: unknown): string {
  return describe(err, ROOM_MESSAGES)
}

export function userErrorMessage(err: unknown): string {
  return describe(err, USER_MESSAGES)
}

// Các mã cho thấy dữ liệu đang hiển thị đã cũ so với server (lượt bị đặt trùng, đã bị hủy, đã bắt đầu...)
const STALE_CODES = new Set(['91', '93', '97'])

export function isStaleError(err: unknown): boolean {
  return err instanceof ApiError && STALE_CODES.has(err.code)
}

// Mã 80 đã được client.ts xử lý chung (về màn đăng nhập), không cần hiện thêm lỗi
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.code === '80'
}

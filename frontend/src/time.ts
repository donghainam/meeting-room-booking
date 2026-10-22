// Backend dùng múi giờ Asia/Ho_Chi_Minh (SRS D1) và thời gian không kèm offset,
// nên mọi phép tính "hôm nay", "bây giờ" ở đây đều theo giờ HCM, không theo múi giờ của trình duyệt.
const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

// yyyy-MM-ddTHH:mm:ss theo giờ HCM
export function nowInHcm(now = new Date()): string {
  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(now)) {
    parts[part.type] = part.value
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

// yyyy-MM-dd theo giờ HCM
export function todayInHcm(now = new Date()): string {
  return nowInHcm(now).slice(0, 10)
}

// Ô nhập của app là hai ô văn bản (dd/MM/yyyy và HH:mm 24 giờ), không dùng <input type="date"> hay "datetime-local"
// vì hai loại đó hiển thị theo locale của trình duyệt (vd mm/dd/yyyy, AM/PM) chứ không theo ý app.
// Ghép lại thành yyyy-MM-ddTHH:mm; API cần thêm giây và không có offset
export function toApiDateTime(local: string): string {
  return local.length === 16 ? `${local}:00` : local
}

// yyyy-MM-ddTHH:mm[:ss] → yyyy-MM-ddTHH:mm (bỏ giây)
export function toInputValue(api: string): string {
  return api.slice(0, 16)
}

// yyyy-MM-dd → dd/MM/yyyy
export function formatDisplayDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

// Nhận ngày gõ tự do rồi đưa về yyyy-MM-dd: "2 3 2026", "2/3/2026", "02-03-2026", "2.3.2026" hoặc gõ liền "02032026"
// đều là 02/03/2026. Ngày, tháng 1–2 chữ số, năm đủ 4 chữ số (không đoán năm 2 chữ số vì đang gõ dở "2 3 20" sẽ bị hiểu nhầm là năm 2020).
// null nếu sai định dạng hoặc ngày không có thật (31/02, 29/02 năm không nhuận)
export function parseDisplayDate(text: string): string | null {
  const raw = text.trim()
  if (!/^[\d\s/.,-]+$/.test(raw)) {
    return null
  }
  const parts = /^\d{8}$/.test(raw)
    ? [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4)]
    : raw.split(/\D+/).filter((part) => part !== '')
  if (parts.length !== 3 || parts[0].length > 2 || parts[1].length > 2 || parts[2].length !== 4) {
    return null
  }
  const [day, month, year] = parts.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

// Nhận giờ 24h gõ tự do rồi đưa về HH:mm: "9 30", "9:30", "9h30", "9.30", "930", "1430" đều hiểu theo 24 giờ;
// chỉ gõ giờ ("9", "14h") thì phút là :00. Phút luôn 2 chữ số khi có tách ("9:5" bị từ chối vì không rõ 05 hay 50).
// null nếu giờ > 23, phút > 59, hoặc có chữ lạ như AM/PM
export function parseClock(text: string): string | null {
  const raw = text.trim()
  if (!/^[\d\s:.h]+$/i.test(raw)) {
    return null
  }
  let hourText: string
  let minuteText: string
  if (/^\d{3,4}$/.test(raw)) {
    hourText = raw.slice(0, -2)
    minuteText = raw.slice(-2)
  } else {
    const parts = raw.split(/[^\d]+/).filter((part) => part !== '')
    if (parts.length === 1) {
      ;[hourText, minuteText] = [parts[0], '00']
    } else if (parts.length === 2) {
      ;[hourText, minuteText] = parts
    } else {
      return null
    }
  }
  if (hourText.length > 2 || minuteText.length !== 2) {
    return null
  }
  const [hour, minute] = [Number(hourText), Number(minuteText)]
  if (hour > 23 || minute > 59) {
    return null
  }
  return `${String(hour).padStart(2, '0')}:${minuteText}`
}

// Khi rời ô: hiểu được thì viết lại cho chuẩn (2 3 2026 → 02/03/2026, 930 → 09:30), không hiểu thì giữ nguyên để người dùng sửa
export function normalizeDateText(text: string): string {
  const iso = parseDisplayDate(text)
  return iso ? formatDisplayDate(iso) : text
}

export function normalizeClockText(text: string): string {
  return parseClock(text) ?? text
}

// Ghép ô ngày + ô giờ thành yyyy-MM-ddTHH:mm; chuỗi rỗng nếu một trong hai chưa hợp lệ
export function combineDateTime(dateText: string, clockText: string): string {
  const date = parseDisplayDate(dateText)
  const clock = parseClock(clockText)
  return date && clock ? `${date}T${clock}` : ''
}

// Lượt đã bắt đầu khi startTime <= now (BR8). Hai chuỗi cùng định dạng nên so sánh từ điển là đúng
export function hasStarted(startTime: string, now = new Date()): boolean {
  return startTime <= nowInHcm(now)
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

// Số phút kể từ một mốc cố định, dùng để so sánh/trừ hai giờ cùng hệ; null nếu sai định dạng
export function toMinutes(value: string): number | null {
  const match = DATE_TIME.exec(value)
  if (!match) {
    return null
  }
  const [, year, month, day, hour, minute] = match.map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) / 60_000
}

// "09:00 – 10:30" nếu cùng ngày; khác ngày thì kèm "dd/MM" ở cả hai đầu
export function formatRange(start: string, end: string): string {
  const startTime = start.slice(11, 16)
  const endTime = end.slice(11, 16)
  if (start.slice(0, 10) === end.slice(0, 10)) {
    return `${startTime} – ${endTime}`
  }
  const shortDate = (value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}`
  return `${shortDate(start)} ${startTime} – ${shortDate(end)} ${endTime}`
}

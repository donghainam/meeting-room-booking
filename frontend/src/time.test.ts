import { describe, expect, it } from 'vitest'
import {
  combineDateTime,
  formatDisplayDate,
  formatRange,
  hasStarted,
  normalizeClockText,
  normalizeDateText,
  nowInHcm,
  parseClock,
  parseDisplayDate,
  toApiDateTime,
  toInputValue,
  toMinutes,
  todayInHcm,
} from './time'

describe('giờ HCM', () => {
  it('nowInHcm đổi từ UTC sang UTC+7, không theo múi giờ trình duyệt', () => {
    expect(nowInHcm(new Date('2026-10-22T02:30:15Z'))).toBe('2026-10-22T09:30:15')
  })

  it('todayInHcm sang ngày mới khi UTC vẫn là hôm trước', () => {
    expect(todayInHcm(new Date('2026-10-21T17:30:00Z'))).toBe('2026-10-22')
  })

  it('nửa đêm HCM hiển thị 00, không phải 24', () => {
    expect(nowInHcm(new Date('2026-10-21T17:00:00Z'))).toBe('2026-10-22T00:00:00')
  })
})

describe('hasStarted (BR8)', () => {
  const now = new Date('2026-10-22T02:00:00Z') // 09:00 HCM

  it('đúng khi startTime bằng hoặc trước bây giờ', () => {
    expect(hasStarted('2026-10-22T09:00:00', now)).toBe(true)
    expect(hasStarted('2026-10-22T08:59:59', now)).toBe(true)
  })

  it('sai khi startTime sau bây giờ', () => {
    expect(hasStarted('2026-10-22T09:00:01', now)).toBe(false)
  })
})

describe('chuyển định dạng', () => {
  it('toApiDateTime thêm giây và không thêm offset', () => {
    expect(toApiDateTime('2026-10-22T09:00')).toBe('2026-10-22T09:00:00')
    expect(toApiDateTime('2026-10-22T09:00:30')).toBe('2026-10-22T09:00:30')
  })

  it('toInputValue bỏ giây', () => {
    expect(toInputValue('2026-10-22T09:00:00')).toBe('2026-10-22T09:00')
  })

  it('toMinutes trừ được qua nửa đêm và trả null khi sai định dạng', () => {
    const start = toMinutes('2026-10-22T23:00')!
    const end = toMinutes('2026-10-23T01:30:00')!
    expect(end - start).toBe(150)
    expect(toMinutes('')).toBeNull()
    expect(toMinutes('2026-10-22')).toBeNull()
  })
})

describe('formatRange', () => {
  it('cùng ngày chỉ hiện giờ', () => {
    expect(formatRange('2026-10-22T09:00:00', '2026-10-22T10:30:00')).toBe('09:00 – 10:30')
  })

  it('qua nửa đêm hiện thêm ngày ở cả hai đầu', () => {
    expect(formatRange('2026-10-22T23:00:00', '2026-10-23T01:00:00')).toBe('22/10 23:00 – 23/10 01:00')
  })
})

describe('ngày dd/MM/yyyy', () => {
  it('formatDisplayDate đổi yyyy-MM-dd sang dd/MM/yyyy', () => {
    expect(formatDisplayDate('2026-10-22')).toBe('22/10/2026')
    expect(formatDisplayDate('2026-10-22T09:00:00')).toBe('22/10/2026')
  })

  it('parseDisplayDate nhận 1 hoặc 2 chữ số và chuẩn hóa về yyyy-MM-dd', () => {
    expect(parseDisplayDate('22/10/2026')).toBe('2026-10-22')
    expect(parseDisplayDate('5/3/2099')).toBe('2099-03-05')
    expect(parseDisplayDate(' 01/01/2099 ')).toBe('2099-01-01')
  })

  it('parseDisplayDate tự nhận diện cách gõ tự do: 2 3 2026 → 02/03/2026', () => {
    for (const typed of ['2 3 2026', '2/3/2026', '02-03-2026', '2.3.2026', '2,3,2026', '  2   3   2026 ', '02032026']) {
      expect(parseDisplayDate(typed), typed).toBe('2026-03-02')
    }
  })

  it('parseDisplayDate từ chối ngày không có thật và sai định dạng', () => {
    // '2 3 20' là đang gõ dở năm, không được đoán thành năm 2020; '2099-01-01' là kiểu ISO, không phải dd/MM/yyyy
    const bads = ['31/02/2099', '29/02/2099', '00/01/2099', '32/01/2099', '01/13/2099', '2099-01-01', '1/1/99', '2 3 20', '2 3', '020326', '2032026', '2 3 2026 abc', '']
    for (const bad of bads) {
      expect(parseDisplayDate(bad), bad).toBeNull()
    }
  })

  it('29/02 chỉ hợp lệ ở năm nhuận', () => {
    expect(parseDisplayDate('29/02/2096')).toBe('2096-02-29')
  })
})

describe('giờ 24h HH:mm', () => {
  it('parseClock nhận 00:00 đến 23:59 và chuẩn hóa giờ 1 chữ số', () => {
    expect(parseClock('00:00')).toBe('00:00')
    expect(parseClock('23:59')).toBe('23:59')
    expect(parseClock('9:30')).toBe('09:30')
    expect(parseClock(' 14:05 ')).toBe('14:05')
  })

  it('parseClock tự nhận diện cách gõ tự do theo 24 giờ', () => {
    const cases: Array<[string, string]> = [
      ['9 30', '09:30'],
      ['9h30', '09:30'],
      ['9.30', '09:30'],
      ['930', '09:30'],
      ['0930', '09:30'],
      ['1430', '14:30'],
      ['14 05', '14:05'],
      ['9', '09:00'],
      ['14h', '14:00'],
      ['23 59', '23:59'],
    ]
    for (const [typed, expected] of cases) {
      expect(parseClock(typed), typed).toBe(expected)
    }
  })

  it('parseClock từ chối 24:00, phút > 59, AM/PM và định dạng sai', () => {
    for (const bad of ['24:00', '09:60', '9:5', '09:00 AM', '2400', '9 30 15', '', 'abc', '123456']) {
      expect(parseClock(bad), bad).toBeNull()
    }
  })

  it('combineDateTime ghép ngày + giờ, rỗng nếu một trong hai sai', () => {
    expect(combineDateTime('05/03/2099', '14:30')).toBe('2099-03-05T14:30')
    expect(combineDateTime('31/02/2099', '14:30')).toBe('')
    expect(combineDateTime('05/03/2099', '25:00')).toBe('')
  })
})

describe('viết lại cho chuẩn khi rời ô', () => {
  it('hiểu được thì chuẩn hóa, không hiểu thì giữ nguyên chữ người dùng đã gõ', () => {
    expect(normalizeDateText('2 3 2026')).toBe('02/03/2026')
    expect(normalizeDateText('31/02/2026')).toBe('31/02/2026')
    expect(normalizeClockText('930')).toBe('09:30')
    expect(normalizeClockText('25:00')).toBe('25:00')
  })
})

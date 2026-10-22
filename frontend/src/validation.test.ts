import { describe, expect, it } from 'vitest'
import { validateBooking, validateUser, type BookingFormValues } from './validation'

const valid: BookingFormValues = {
  title: 'Họp nhóm',
  attendees: '5',
  startTime: '2026-10-22T09:00',
  endTime: '2026-10-22T10:00',
}

describe('validateBooking', () => {
  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(validateBooking(valid)).toEqual({})
  })

  it('BR1: giờ kết thúc phải sau giờ bắt đầu (bằng nhau cũng sai)', () => {
    expect(validateBooking({ ...valid, endTime: '2026-10-22T09:00' }).endTime).toBeDefined()
    expect(validateBooking({ ...valid, endTime: '2026-10-22T08:00' }).endTime).toBeDefined()
  })

  it('BR3: đúng 4 giờ được, quá 4 giờ bị chặn', () => {
    expect(validateBooking({ ...valid, endTime: '2026-10-22T13:00' }).endTime).toBeUndefined()
    expect(validateBooking({ ...valid, endTime: '2026-10-22T13:01' }).endTime).toBeDefined()
  })

  it('BR3 tính đúng khi qua nửa đêm', () => {
    const overnight = { ...valid, startTime: '2026-10-22T22:00', endTime: '2026-10-23T02:00' }
    expect(validateBooking(overnight).endTime).toBeUndefined()
  })

  it('thiếu giờ thì báo từng ô', () => {
    const errors = validateBooking({ ...valid, startTime: '', endTime: '' })
    expect(errors.startTime).toBeDefined()
    expect(errors.endTime).toBeDefined()
  })

  it('title: rỗng, chỉ khoảng trắng, hơn 200 ký tự bị chặn; đúng 200 (sau trim) được', () => {
    expect(validateBooking({ ...valid, title: '  ' }).title).toBeDefined()
    expect(validateBooking({ ...valid, title: 'a'.repeat(201) }).title).toBeDefined()
    expect(validateBooking({ ...valid, title: ` ${'a'.repeat(200)} ` }).title).toBeUndefined()
  })

  it('attendees phải là số nguyên ≥ 1', () => {
    for (const bad of ['0', '', 'abc', '1.5', '-2']) {
      expect(validateBooking({ ...valid, attendees: bad }).attendees, bad).toBeDefined()
    }
    expect(validateBooking({ ...valid, attendees: '1' }).attendees).toBeUndefined()
  })
})

describe('validateUser', () => {
  it('chấp nhận username 3–50 ký tự hợp lệ và password 8–72 ký tự', () => {
    expect(validateUser({ username: 'bob', password: 'password' })).toEqual({})
    expect(validateUser({ username: 'a.b_c-9'.padEnd(50, 'x'), password: 'p'.repeat(72) })).toEqual({})
  })

  it('username quá ngắn, quá dài hoặc chỉ có khoảng trắng bị chặn', () => {
    for (const bad of ['', 'ab', '   ', 'a'.repeat(51)]) {
      expect(validateUser({ username: bad, password: 'password' }).username, bad).toBeDefined()
    }
  })

  it('username chỉ nhận a-z A-Z 0-9 . _ -', () => {
    for (const bad of ['bob smith', 'bob@mail', 'bób', 'a/b']) {
      expect(validateUser({ username: bad, password: 'password' }).username, bad).toBeDefined()
    }
  })

  it('username được trim trước khi kiểm (server cũng trim)', () => {
    expect(validateUser({ username: '  bob  ', password: 'password' }).username).toBeUndefined()
  })

  it('password 7 hoặc 73 ký tự bị chặn và không bị trim', () => {
    expect(validateUser({ username: 'bob', password: 'p'.repeat(7) }).password).toBeDefined()
    expect(validateUser({ username: 'bob', password: 'p'.repeat(73) }).password).toBeDefined()
    expect(validateUser({ username: 'bob', password: '       a' }).password).toBeUndefined()
  })
})

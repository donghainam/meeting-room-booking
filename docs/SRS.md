# SRS — Meeting Room Booking (v1.0)

## 1. Mục tiêu
Cho nhân viên đặt phòng họp, tránh hai nhóm đặt cùng một phòng vào cùng một giờ.

## 2. Đối tượng dữ liệu

### Room
| Field | Kiểu | Ràng buộc |
|---|---|---|
| id | Long | tự sinh |
| name | String | bắt buộc, duy nhất, tối đa 100 ký tự |
| capacity | Integer | bắt buộc, 1–100 |
| active | Boolean | mặc định `true` |

### Booking
| Field | Kiểu | Ràng buộc |
|---|---|---|
| id | Long | tự sinh |
| roomId | Long | bắt buộc, phòng phải tồn tại |
| title | String | bắt buộc, tối đa 200 ký tự |
| organizer | String | lấy từ header `X-User-Id` |
| attendees | Integer | bắt buộc, ≥ 1 |
| startTime | DateTime | bắt buộc |
| endTime | DateTime | bắt buộc |
| status | Enum | `BOOKED` / `CANCELLED` |

## 3. API

| # | Method | Path | Mô tả |
|---|---|---|---|
| A1 | POST | `/api/rooms` | Tạo phòng |
| A2 | GET | `/api/rooms` | Danh sách phòng |
| A3 | POST | `/api/bookings` | Đặt phòng |
| A4 | PUT | `/api/bookings/{id}` | Sửa lượt đặt (giờ, tiêu đề, số người) |
| A5 | POST | `/api/bookings/{id}/cancel` | Hủy lượt đặt |
| A6 | GET | `/api/bookings?roomId=&date=` | Lịch một phòng trong một ngày |

## 4. Luật nghiệp vụ

- **BR1**: `endTime` phải sau `startTime`.
- **BR2**: Không đặt hoặc sửa thành thời điểm trong quá khứ.
- **BR3**: Mỗi lượt đặt tối đa **4 giờ**.
- **BR4 — Không trùng giờ**: trong cùng một phòng, không có 2 lượt `BOOKED` chồng thời gian.
  - `[s1, e1)` và `[s2, e2)` chồng nhau khi `s1 < e2 AND s2 < e1`.
  - Chạm mép được phép: 09:00–10:00 và 10:00–11:00 không trùng.
  - Lượt `CANCELLED` không tính.
  - Khi sửa (A4), không so sánh lượt đặt với chính nó.
- **BR5**: `attendees` không vượt `capacity` của phòng.
- **BR6**: Không đặt phòng có `active = false`.
- **BR7**: Chỉ `organizer` được sửa/hủy lượt đặt của mình.
- **BR8**: Không sửa/hủy lượt đã `CANCELLED` hoặc đã bắt đầu (`startTime <= now`).
- **BR9 — Đặt đồng thời**: hai request đặt/sửa cùng phòng, chồng giờ, gửi gần như cùng lúc → chỉ 1 request thành công, request còn lại nhận lỗi 93.

## 5. Thời gian
- Client gửi thời gian **không kèm offset**, ví dụ `2026-10-22T09:00:00`.
- "Hiện tại" (BR2, BR8) được tính theo múi giờ của ứng dụng (D1).

## 6. Lỗi trả về

Body lỗi:
```json
{ "code": "90", "message": "Invalid data input. Please try again" }
```

| Mã | HTTP | Message | Khi nào |
|---|---|---|---|
| 90 | 400 | Invalid data input. Please try again | Thiếu/sai trường, sai định dạng, BR1, BR3, thiếu `X-User-Id` |
| 91 | 404 | Resource not found | Không thấy phòng / lượt đặt |
| 92 | 403 | Permission denied | Không phải organizer (BR7) |
| 93 | 409 | Room is already booked for this time | Trùng giờ (BR4, BR9) |
| 94 | 422 | Booking time must be in the future | BR2 |
| 95 | 422 | Attendees exceed room capacity | BR5 |
| 96 | 422 | Room is not available | BR6 |
| 97 | 422 | Booking can no longer be modified | BR8 |
| 98 | 409 | Room name already exists | Trùng tên phòng |
| 99 | 500 | System error. Please try again later | Lỗi không lường trước |

Logging:
- Lỗi 90–98 (lỗi client): log `WARN`, một dòng gồm mã lỗi + path + lý do, không in stacktrace.
- Lỗi 99 (lỗi hệ thống): log `ERROR` **kèm stacktrace**. Client chỉ nhận message chung, không lộ chi tiết nội bộ.

## 7. Ngoài phạm vi (v0.1)
Đăng nhập/Spring Security thật, lặp lịch định kỳ, gửi email mời họp, phân trang, tắt/xóa/sửa phòng.

## 8. Quyết định thiết kế
- **D1 — Múi giờ**: cố định `Asia/Ho_Chi_Minh` trong cấu hình; lấy "hiện tại" qua bean `Clock`.
- **D2 — Khung response**: lỗi theo bảng mã ở mục 6; response thành công dùng cùng khung:
  ```json
  { "code": "00", "message": "Success", "data": { } }
  ```
  Response lỗi không có `data`.
- **D3 — Đảm bảo BR9**: khóa bản ghi phòng (`SELECT ... FOR UPDATE`) trong transaction trước khi kiểm tra trùng giờ. Bắt buộc có test bắn 2 request đồng thời.

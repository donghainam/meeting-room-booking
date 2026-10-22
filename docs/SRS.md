# SRS — Meeting Room Booking (v1.2)

## 1. Mục tiêu
Nhân viên đặt phòng họp; không để hai nhóm trùng phòng, trùng giờ. Admin quản lý phòng và người dùng.

## 2. Đối tượng dữ liệu
Quy ước: **bắt buộc** = không null, String không rỗng. Mọi String (trừ `password`) được bỏ khoảng trắng đầu/cuối trước khi kiểm tra.

### User
| Field | Kiểu | Ràng buộc |
|---|---|---|
| id | Long | tự sinh |
| username | String | bắt buộc, 3–50 ký tự, chỉ `a-z A-Z 0-9 . _ -`, duy nhất **không phân biệt hoa/thường** |
| password | String | bắt buộc, 8–72 ký tự; chỉ lưu dạng băm BCrypt, không bao giờ trả về |
| role | Enum | `ADMIN` / `USER`, mặc định `USER` |

### Room
| Field | Kiểu | Ràng buộc |
|---|---|---|
| id | Long | tự sinh |
| name | String | bắt buộc, ≤ 100 ký tự, duy nhất **không phân biệt hoa/thường** (`Room A` = `room a`) |
| capacity | Integer | bắt buộc, 1–100 |
| active | Boolean | luôn `true` khi tạo (bỏ qua giá trị client gửi) |

### Booking
| Field | Kiểu | Ràng buộc |
|---|---|---|
| id | Long | tự sinh |
| roomId | Long | bắt buộc, phòng phải tồn tại, không đổi được |
| title | String | bắt buộc, ≤ 200 ký tự |
| organizer | String | `username` của người đăng nhập (lấy từ token, client không gửi) || attendees | Integer | bắt buộc, ≥ 1 |
| startTime | DateTime | bắt buộc |
| endTime | DateTime | bắt buộc |
| status | Enum | `BOOKED` khi tạo, `CANCELLED` khi hủy |

## 3. Phân quyền

- Mọi API trừ U0 cần header `Authorization: Bearer <token>`. Thiếu, sai, hết hạn token → 80.
- Role không đủ quyền → 92.

| Mã | Tên API | Method | Path | Quyền |
|---|---|---|---|---|
| U0 | Đăng nhập | POST | `/api/auth/login` | công khai |
| U1 | Tạo người dùng | POST | `/api/users` | ADMIN |
| U2 | Xem danh sách người dùng | GET | `/api/users` | ADMIN |
| A1 | Tạo phòng | POST | `/api/rooms` | ADMIN |
| A2 | Xem danh sách phòng | GET | `/api/rooms` | ADMIN, USER |
| A3 | Đặt phòng | POST | `/api/bookings` | ADMIN, USER |
| A4 | Sửa lượt đặt | PUT | `/api/bookings/{id}` | người đặt, ADMIN (BR7) |
| A5 | Hủy lượt đặt | POST | `/api/bookings/{id}/cancel` | người đặt, ADMIN (BR7) |
| A6 | Xem lịch phòng theo ngày | GET | `/api/bookings?roomId=&date=` | ADMIN, USER |

### Tài khoản admin mặc định
- Khi khởi động, nếu chưa có user `admin` thì tạo `admin` / role `ADMIN`, mật khẩu lấy từ cấu hình `app.admin.password` (mặc định `admin`).
- Mật khẩu này không áp luật 8–72 ký tự.
- Mật khẩu vẫn là `admin` → log `WARN` khi khởi động: "Default admin password in use".

## 4. API

- Thành công: HTTP 200, khung D2. `data` là đối tượng vừa tạo/sửa (U1, A1, A3–A5) hoặc mảng, có thể rỗng (U2, A2, A6).
- **U0 Đăng nhập**:
  - Body: `{ "username": "...", "password": "..." }`.
  - Trả `data`: `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 3600 }` (giây).
  - Sai username hoặc password → 80; không tiết lộ sai trường nào.
- **U1 Tạo người dùng**: body `{ "username", "password", "role" }`, `role` không gửi thì là `USER` (được tạo cả `ADMIN`). Trùng username → 81. Trả `{ id, username, role }`.
- **U2 Xem danh sách người dùng**: trả `[{ id, username, role }]`, sắp theo `id` tăng dần.
- **A2 Xem danh sách phòng**: sắp theo `id` tăng dần.
- **A4 Sửa lượt đặt**: gửi đủ `title`, `attendees`, `startTime`, `endTime` (thay toàn bộ).
- **A5 Hủy lượt đặt**: không có body; trả lượt đặt với `status = CANCELLED`.
- **A6 Xem lịch phòng theo ngày**:
  - `roomId`, `date` (`yyyy-MM-dd`) bắt buộc; phòng không tồn tại → 91.
  - Trả lượt `BOOKED` giao với `[date 00:00, date+1 00:00)`, sắp theo `startTime`, gồm cả lượt qua nửa đêm.
  - Lượt kết thúc đúng 00:00 không thuộc ngày sau.

## 5. Luật nghiệp vụ

- **BR1 — Giờ kết thúc sau giờ bắt đầu**: `endTime > startTime`.
- **BR2 — Chỉ đặt trong tương lai**: `startTime > now`, áp dụng cả khi đặt và sửa.
- **BR3 — Tối đa 4 giờ**: `endTime − startTime ≤ 4h`.
- **BR4 — Không trùng giờ**: cùng phòng không có 2 lượt `BOOKED` chồng nhau.
  - `[s1, e1)` và `[s2, e2)` chồng nhau khi `s1 < e2 AND s2 < e1`; chạm mép (09–10 và 10–11) không trùng.
  - Bỏ qua lượt `CANCELLED` và chính lượt đang sửa.
- **BR5 — Không vượt sức chứa**: `attendees ≤ capacity`.
- **BR6 — Phòng phải đang hoạt động**: `active = true` (chưa có API tắt phòng, xem mục 8).
- **BR7 — Chỉ người đặt hoặc admin được sửa/hủy**: người đăng nhập là `organizer`, hoặc có role `ADMIN`.
- **BR8 — Chỉ sửa/hủy lượt chưa bắt đầu**: lượt phải `BOOKED` và `startTime > now`.
- **BR9 — Chống đặt trùng khi gửi đồng thời**: 2 request đặt/sửa chồng giờ cùng phòng gửi cùng lúc → đúng 1 thành công, còn lại 93.

### Thứ tự kiểm tra
Vi phạm nhiều luật → trả lỗi của bước đầu tiên. Mọi API (trừ U0) luôn kiểm tra trước: token → 80, role → 92.

| Bước | A3 Đặt phòng | A4 Sửa lượt đặt | A5 Hủy lượt đặt |
|---|---|---|---|
| 1 | Trường, định dạng → 90 | như A3 | `id` sai kiểu → 90 |
| 2 | BR1 Giờ kết thúc sau giờ bắt đầu, BR3 Tối đa 4 giờ → 90 | như A3 | Lượt đặt không tồn tại → 91 |
| 3 | Phòng không tồn tại → 91 | Lượt đặt không tồn tại → 91 | BR7 Chỉ người đặt hoặc admin được sửa/hủy → 92 |
| 4 | BR6 Phòng phải đang hoạt động → 96 | BR7 Chỉ người đặt hoặc admin được sửa/hủy → 92 | BR8 Chỉ sửa/hủy lượt chưa bắt đầu → 97 |
| 5 | BR2 Chỉ đặt trong tương lai → 94 | BR8 Chỉ sửa/hủy lượt chưa bắt đầu → 97 | |
| 6 | BR5 Không vượt sức chứa → 95 | BR6, BR2, BR5 như A3 | |
| 7 | BR4 Không trùng giờ → 93 | BR4 Không trùng giờ → 93 | |

Ví dụ: user khác hủy lượt đã hủy → 92, vì BR7 đứng trước BR8.

## 6. Thời gian
- Request và response dùng `yyyy-MM-ddTHH:mm:ss`, không offset (vd `2026-10-22T09:00:00`). Gửi kèm offset → 90.
- `now` tính theo múi giờ ứng dụng (D1).

## 7. Lỗi trả về

```json
{ "code": "90", "message": "Invalid data input. Please try again" }
```

| Mã | HTTP | Message | Khi nào |
|---|---|---|---|
| 80 | 401 | Unauthorized | Thiếu/sai/hết hạn token; đăng nhập sai |
| 81 | 409 | Username already exists | Trùng username (kể cả gửi đồng thời) |
| 90 | 400 | Invalid data input. Please try again | Thiếu/sai trường, sai định dạng, JSON hỏng, thiếu param, BR1 Giờ kết thúc sau giờ bắt đầu, BR3 Tối đa 4 giờ |
| 91 | 404 | Resource not found | Không thấy phòng / lượt đặt |
| 92 | 403 | Permission denied | Role không đủ quyền; BR7 Chỉ người đặt hoặc admin được sửa/hủy |
| 93 | 409 | Room is already booked for this time | BR4 Không trùng giờ, BR9 Chống đặt trùng khi gửi đồng thời |
| 94 | 422 | Booking time must be in the future | BR2 Chỉ đặt trong tương lai |
| 95 | 422 | Attendees exceed room capacity | BR5 Không vượt sức chứa |
| 96 | 422 | Room is not available | BR6 Phòng phải đang hoạt động |
| 97 | 422 | Booking can no longer be modified | BR8 Chỉ sửa/hủy lượt chưa bắt đầu |
| 98 | 409 | Room name already exists | Trùng tên phòng (kể cả gửi đồng thời) |
| 99 | 500 | System error. Please try again later | Lỗi ngoài dự kiến |

- Message cố định theo bảng.
- URL không tồn tại: HTTP 404, body rỗng (không theo D2).

Logging:
- 80–98: `WARN` một dòng (mã + path + lý do), không stacktrace. Lỗi 90 chỉ log tên trường/header/param, không log giá trị client gửi.
- 99: `ERROR` kèm stacktrace; client chỉ nhận message chung.
- Không bao giờ log `password` hay token.

## 8. Ngoài phạm vi
Refresh token, đăng xuất/thu hồi token, đổi mật khẩu, khóa/xóa/sửa user, lặp lịch định kỳ, email mời họp, phân trang, tắt/xóa/sửa phòng.

## 9. Quyết định thiết kế
- **D1 — Múi giờ**: cố định `Asia/Ho_Chi_Minh` (`app.timezone`), lấy `now` qua bean `Clock`.
- **D2 — Khung response**: thành công `{ "code": "00", "message": "Success", "data": { } }`; lỗi theo mục 7, không có `data`. Lỗi 80/92 phát sinh ở tầng Spring Security cũng phải trả đúng khung này.
- **D3 — Khóa cho BR9**: `SELECT ... FOR UPDATE` trong transaction, trước khi kiểm tra trùng giờ.
  - A3 Đặt phòng: khóa phòng.
  - A4 Sửa lượt đặt: khóa lượt đặt rồi phòng (cố định thứ tự, tránh deadlock).
  - A5 Hủy lượt đặt: khóa lượt đặt.
  - Bắt buộc test 2 request đồng thời cho A3, A4.
- **D4 — Tên phòng duy nhất**: cột `nameKey` (name viết thường) có unique constraint; kiểm tra trước khi lưu, constraint chặn trường hợp đồng thời → 98.
- **D5 — Lưu trữ**: H2 in-memory, mất dữ liệu khi restart (user tạo thêm cũng mất; admin mặc định được tạo lại).
- **D6 — Xác thực**: JWT ký HS256, hạn 1 giờ, payload gồm `sub` (username) và `role`.
  - Secret lấy từ cấu hình `app.jwt.secret` (≥ 32 byte); không commit secret thật.
  - Dùng `spring-boot-starter-security` + `spring-boot-starter-security-oauth2-resource-server` (thư viện chính thức của Spring, không cần thư viện JWT bên thứ ba).
  - Token còn hạn nhưng user không còn tồn tại → 80.
- **D7 — Mật khẩu**: băm bằng BCrypt.

## Lịch sử thay đổi
| Version | Ngày | Nội dung |
|---|---|---|
| 1.0 | 2026-10-21 | Bản duyệt đầu tiên |
| 1.1 | 2026-10-22 | Đồng bộ từ code A1–A6; thêm thứ tự kiểm tra, D4, D5; đặt tên cho API và BR; rút gọn câu chữ |
| 1.2 | 2026-10-22 | Phân quyền ADMIN/USER, đăng nhập JWT (U0), quản lý user (U1, U2), admin mặc định; bỏ `X-User-Id`; BR7 cho phép admin; mã lỗi 80, 81; D6, D7 |

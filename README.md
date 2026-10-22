# Meeting Room Booking

Ứng dụng backend cho nhân viên đặt phòng họp, đảm bảo hai nhóm không đặt trùng một phòng vào cùng một giờ.

> **Trạng thái:** mới có khung dự án Spring Boot. Nghiệp vụ **chưa được code** — SRS (v0.3) đang chờ duyệt bản cuối.

## Công nghệ

| Thành phần | Phiên bản / ghi chú |
|---|---|
| Java | 17 |
| Spring Boot | 4.1.1 |
| Module Spring | Web MVC, Data JPA, Validation |
| Database | H2 (runtime, kèm H2 console) |
| Build | Maven (dùng kèm Maven Wrapper) |

## Yêu cầu môi trường

- JDK 17+
- Không cần cài Maven riêng, dùng `mvnw` / `mvnw.cmd` có sẵn.

## Chạy dự án

```bash
# Linux / macOS
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```

Chạy test:

```bash
./mvnw test
```

Hiện chỉ có một test kiểm tra context khởi động được (`MeetingRoomBookingApplicationTests`).

## Chạy frontend

Frontend (React + Vite + TypeScript) nằm ở `frontend/`, hiện có đầy đủ các màn hình theo SRS: đăng nhập, danh sách/tạo phòng, lịch phòng theo ngày kèm đặt/sửa/hủy, và quản lý người dùng cho ADMIN (U0–U2, A1–A6). Cần Node.js 20+.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build
```

- Backend phải chạy ở port 8082; dev server proxy `/api` sang đó nên không cần CORS. Port 8082 đang bị chiếm thì chạy backend ở cổng khác và đặt `BACKEND_URL`, ví dụ `$env:BACKEND_URL="http://localhost:8083"; npm run dev` (PowerShell).
- Đăng nhập bằng tài khoản mặc định `admin` / `admin` (ADMIN thấy form Tạo phòng, USER thì không).
- Token lưu ở `sessionStorage`, mất khi đóng tab.

## Tính năng dự kiến

Chi tiết đầy đủ ở [docs/SRS.md](docs/SRS.md).

| # | Method | Path | Mô tả |
|---|---|---|---|
| A1 | POST | `/api/rooms` | Tạo phòng |
| A2 | GET | `/api/rooms` | Danh sách phòng |
| A3 | POST | `/api/bookings` | Đặt phòng |
| A4 | PUT | `/api/bookings/{id}` | Sửa lượt đặt |
| A5 | POST | `/api/bookings/{id}/cancel` | Hủy lượt đặt |
| A6 | GET | `/api/bookings?roomId=&date=` | Xem lịch một phòng trong một ngày |

### Điểm đáng chú ý trong thiết kế

- **Không trùng giờ:** hai khoảng `[s1, e1)` và `[s2, e2)` chồng nhau khi `s1 < e2 AND s2 < e1`; chạm mép (10:00 – 10:00) được phép. Lượt `CANCELLED` không tính.
- **Đặt đồng thời:** khóa bản ghi phòng (`SELECT ... FOR UPDATE`) trong transaction trước khi kiểm tra trùng giờ, để chỉ đúng 1 request thành công.
- **Người đặt:** lấy từ header `X-User-Id` (chưa có đăng nhập / Spring Security thật).
- **Múi giờ:** cố định `Asia/Ho_Chi_Minh`; client gửi thời gian không kèm offset, ví dụ `2026-10-22T09:00:00`.
- **Response thống nhất:**
  ```json
  { "code": "00", "message": "Success", "data": { } }
  ```
  Lỗi dùng cùng khung (không có `data`) với mã lỗi riêng 90–99, xem bảng mã trong SRS.

## Cấu trúc thư mục

```
meeting-room-booking/
├── docs/SRS.md                      # Đặc tả yêu cầu
├── src/main/java/com/practice/booking/
│   └── MeetingRoomBookingApplication.java
├── src/main/resources/application.properties
├── src/test/java/com/practice/booking/
├── frontend/                        # React + Vite + TypeScript
└── pom.xml
```

## Ngoài phạm vi (v0.1)

Đăng nhập thật, lặp lịch định kỳ, gửi email mời họp, phân trang, tắt/xóa/sửa phòng.

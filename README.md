# Meeting Room Booking

Ứng dụng đặt phòng họp cho nhân viên: không để hai nhóm đặt trùng một phòng vào cùng một giờ. Admin quản lý phòng và người dùng.

## Về dự án này

Đây là **dự án thử nghiệm cách làm việc với AI**, không phải sản phẩm để dùng thật.

- **Toàn bộ code (backend Java Spring Boot và frontend React) do AI viết**, cụ thể là [Claude Code](https://claude.com/claude-code) của Anthropic. Con người không gõ code mà định hướng, duyệt kế hoạch, review kết quả và nghiệm thu.
- Mục tiêu thử nghiệm: đưa một đặc tả yêu cầu ([docs/SRS.md](docs/SRS.md)) cho AI, để AI phân tích rồi sinh code đúng phong cách của repo, kèm test.
- Cách làm việc được ghi thành quy tắc trong [CLAUDE.md](CLAUDE.md):
  1. AI đọc SRS và code liên quan, lập kế hoạch.
  2. Con người duyệt kế hoạch.
  3. AI code theo kế hoạch, chạy compile và test.
  4. AI báo cáo đã làm gì, luật nghiệp vụ (BR) nào đã có test. Không được báo "xong" khi chưa có output compile/test.
  5. SRS và code mâu thuẫn thì AI dừng lại hỏi, không tự quyết định.
- Vì code do AI sinh ra, hãy **review kỹ trước khi dùng cho mục đích thật**. Có test tự động, nhưng test cũng do AI viết.

Lịch sử commit cho thấy từng bước: các commit có dòng `Co-Authored-By: Claude` là phần AI thực hiện.

## Chạy nhanh

Cần chạy **hai** thứ song song: backend (API) và frontend (giao diện). Mở hai cửa sổ terminal.

### 1. Cần cài sẵn

| Công cụ | Phiên bản | Kiểm tra |
|---|---|---|
| JDK | **17 trở lên** | `java -version` |
| Node.js | **22.12 trở lên** (đã thử với 24) | `node -v` |
| Mạng internet | lần chạy đầu | Maven và npm tải thư viện |

Không cần cài Maven riêng, dùng `mvnw` có sẵn trong `backend/`. Không cần cài database (H2 chạy trong bộ nhớ).

### 2. Terminal 1: backend

```bash
cd backend

./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

Lần đầu `mvnw` tải Maven và thư viện nên mất vài phút. Backend sẵn sàng khi log hiện `Started MeetingRoomBookingApplication` (khoảng 13 giây sau khi đã tải xong), lắng nghe ở port **8082**.

Kiểm tra nhanh:

```bash
curl -s -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
# → {"code":"00","message":"Success","data":{"accessToken":"...","tokenType":"Bearer","expiresIn":3600}}
```

### 3. Terminal 2: frontend

```bash
cd frontend
npm install
npm run dev
```

Mở **http://localhost:5173** và đăng nhập `admin` / `admin`.

Dev server tự chuyển các request `/api` sang backend ở port 8082 nên không cần cấu hình CORS.

### 4. Dùng thử

1. Đăng nhập `admin` / `admin` rồi tạo một phòng ở tab **Phòng**.
2. Tab **Người dùng** (chỉ ADMIN thấy): tạo một user thường (vai trò USER).
3. Bấm **Xem lịch** ở một phòng, chọn ngày rồi **Đặt phòng**. Ngày nhập theo `dd/MM/yyyy` (gõ tự do như `2 3 2026` cũng được), giờ theo 24 giờ.
4. Tab **Lịch đặt**: xem các phòng đã được đặt trong một ngày kèm giờ.

Dữ liệu nằm trong bộ nhớ nên **mất khi tắt backend**; mỗi lần chạy lại chỉ còn tài khoản `admin` mặc định.

### Cấu hình

Giá trị mặc định nằm ở `backend/src/main/resources/application.properties`. Có thể ghi đè bằng biến môi trường:

| Biến môi trường | Ý nghĩa | Mặc định |
|---|---|---|
| `SERVER_PORT` | Port của backend | `8082` |
| `APP_JWT_SECRET` | Khóa ký JWT, tối thiểu 32 byte. Giá trị mặc định chỉ dùng khi dev | giá trị dev trong file |
| `APP_ADMIN_PASSWORD` | Mật khẩu của `admin` mặc định (log cảnh báo khi còn là `admin`) | `admin` |
| `BACKEND_URL` | (frontend) địa chỉ backend mà dev server proxy tới | `http://localhost:8082` |

### Gặp lỗi?

| Triệu chứng | Cách xử lý |
|---|---|
| `java -version` thấp hơn 17, hoặc Maven báo sai phiên bản Java | Cài JDK 17+ rồi đặt `JAVA_HOME` trỏ tới nó (`export JAVA_HOME=/đường/dẫn/jdk-17` hoặc `$env:JAVA_HOME="C:\...\jdk-17"`), mở terminal mới. |
| Backend báo `Port 8082 was already in use` | Đang có ứng dụng khác dùng 8082. Chạy backend ở cổng khác, ví dụ PowerShell: `$env:SERVER_PORT="8083"; mvnw.cmd spring-boot:run`; bash: `SERVER_PORT=8083 ./mvnw spring-boot:run`. Rồi chạy frontend với `BACKEND_URL` tương ứng: `$env:BACKEND_URL="http://localhost:8083"; npm run dev` (bash: `BACKEND_URL=http://localhost:8083 npm run dev`). |
| Đăng nhập luôn báo "Hệ thống đang gặp lỗi" | Có thể backend đang chạy bản cũ từ trước. Dừng hẳn backend rồi chạy lại từ thư mục `backend/`. |
| `./mvnw: Permission denied` (Linux/macOS) | `chmod +x backend/mvnw`. |
| `npm test` hoặc `npm run dev` báo sai phiên bản Node | Dùng Node 22.12+ (Vitest yêu cầu). Chỉ chạy `dev`/`build` thì Node 20.19+ cũng được. |
| Đang dùng thì bị đưa về màn đăng nhập | Phiên hết hạn (1 giờ) hoặc vừa khởi động lại backend nên user thường không còn tồn tại. Đăng nhập lại. |

### Chạy test

```bash
cd backend && ./mvnw test        # backend (Windows: mvnw.cmd test)
cd frontend && npm test          # frontend, dùng Vitest
cd frontend && npm run build     # kiểm tra kiểu và build frontend
```

Quy ước của repo: mỗi luật nghiệp vụ (BR) có ít nhất một test, riêng BR9 (đặt đồng thời) có test hai request cùng lúc.

## Công nghệ

| Thành phần | Ghi chú |
|---|---|
| Backend | Java 17, Spring Boot 4.1.1 (Web MVC, Data JPA, Validation, Security + OAuth2 resource server cho JWT) |
| Database | H2 in-memory, **mất dữ liệu khi restart** (SRS D5) |
| Build | Maven (dùng kèm Maven Wrapper) |
| Frontend | React + Vite + TypeScript, test bằng Vitest |

## Chức năng

Đặc tả đầy đủ ở [docs/SRS.md](docs/SRS.md) (v1.3).

| # | Method | Path | Mô tả | Quyền |
|---|---|---|---|---|
| U0 | POST | `/api/auth/login` | Đăng nhập, nhận JWT | công khai |
| U1 | POST | `/api/users` | Tạo người dùng | ADMIN |
| U2 | GET | `/api/users` | Danh sách người dùng | ADMIN |
| A1 | POST | `/api/rooms` | Tạo phòng | ADMIN |
| A2 | GET | `/api/rooms` | Danh sách phòng | ADMIN, USER |
| A3 | POST | `/api/bookings` | Đặt phòng | ADMIN, USER |
| A4 | PUT | `/api/bookings/{id}` | Sửa lượt đặt | người đặt, ADMIN |
| A5 | POST | `/api/bookings/{id}/cancel` | Hủy lượt đặt | người đặt, ADMIN |
| A6 | GET | `/api/bookings?roomId=&date=` | Lịch một phòng trong một ngày | ADMIN, USER |

Điểm đáng chú ý trong thiết kế:

- **Không trùng giờ:** `[s1, e1)` và `[s2, e2)` chồng nhau khi `s1 < e2 AND s2 < e1`; chạm mép (10:00 – 10:00) được phép. Lượt `CANCELLED` không tính.
- **Đặt đồng thời:** khóa bản ghi trong transaction (`SELECT ... FOR UPDATE`) trước khi kiểm tra trùng giờ, để chỉ đúng một request thành công.
- **Phân quyền:** JWT (HS256, hạn 1 giờ); mật khẩu băm BCrypt. Người đặt lấy từ token, không phải từ client. Token ở frontend lưu trong `sessionStorage`, mất khi đóng tab.
- **Múi giờ:** cố định `Asia/Ho_Chi_Minh`; thời gian gửi và nhận không kèm offset, ví dụ `2026-10-22T09:00:00`.
- **Response thống nhất:** `{ "code": "00", "message": "Success", "data": { } }`; lỗi dùng cùng khung (không có `data`) với mã riêng 80–99, xem bảng mã trong SRS.
- **Giới hạn của màn Lịch đặt:** chỉ xem được theo một ngày, vì SRS chưa có API liệt kê tất cả lượt đặt. Frontend ghép từ lịch của từng phòng nên số lần gọi bằng số phòng.

## Cấu trúc thư mục

```
meeting-room-booking/
├── docs/SRS.md                          # Đặc tả yêu cầu (nguồn sự thật)
├── CLAUDE.md                            # Quy tắc làm việc với AI
├── backend/                             # Spring Boot
│   ├── pom.xml, mvnw, mvnw.cmd, .mvn/
│   ├── src/main/java/com/practice/booking/   # controller / service / repository / entity / dto / exception / config
│   ├── src/main/resources/application.properties
│   └── src/test/java/com/practice/booking/   # Test backend
└── frontend/                            # React + Vite + TypeScript
```

Gốc repo chỉ giữ README, tài liệu (`docs/`), `CLAUDE.md`, cấu hình Claude Code (`.claude/`) và cấu hình git.

## Ngoài phạm vi

Theo SRS: refresh token, đăng xuất/thu hồi token, đổi mật khẩu, khóa/xóa/sửa user, lặp lịch định kỳ, gửi email mời họp, phân trang, tắt/xóa/sửa phòng.

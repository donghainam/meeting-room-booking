# CLAUDE.md — meeting-room-booking

## Project
Dự án mục đích cho nhân viên đặt phòng họp. Stack chính Java Spring Boot 4; Java 17; Database H2

## Requirements
- Follow up theo docs/SRS.md.
- Khi SRS và code mâu thuẫn hỏi lại, không tự quyết định.

## Build & test
- JDK 17 tại `~/.jdks/ms-17.0.20.1` (PATH đang là Java 8, KHÔNG dùng)
- Compile: `$env:JAVA_HOME="$HOME\.jdks\ms-17.0.20.1"; .\mvnw.cmd -q compile`
- Test:    `$env:JAVA_HOME="$HOME\.jdks\ms-17.0.20.1"; .\mvnw.cmd -q test`

## Code conventions
- Package: Theo tầng (controller/, service/, repository/)
- DTO: [Action][Entity]Request.java/ [Entity]Response.java
- Response: Khung response 
    ```json
    { "code": "00", "message": "Success", "data": { } }
    ```
- Errors: Trả về mã lỗi theo từng case, Mã lỗi định nghĩa enum ErrorCode (gồm code, message, httpStatus) + một BusinessException(ErrorCode) + một @RestControllerAdvice xử lý tập trung
- Time: Lấy giờ hiện tại qua bean Clock (ZoneId Asia/Ho_Chi_Minh) được inject. Cấm gọi LocalDateTime.now() trực tiếp.

## Testing
- Mỗi BR trong SRS có ít nhất 1 test, tên test ghi mã BR (ví dụ br4_overlap_returns93). BR9 bắt buộc có test 2 request đồng thời.

## Workflow
1. Đọc SRS + code liên quan, lập plan
2. Trình plan, chờ ANam duyệt
3. Code theo plan
4. Compile + test, dán output
5. Báo cáo: đã làm gì, BR nào đã có test

## Never
- Không báo "xong" khi chưa dán output compile/test.
- Không sửa docs/SRS.md khi chưa hỏi.
- Không thêm dependency mới khi chưa hỏi.
- Không sửa/xóa test để cho pass. Test fail mà nghi do SRS mơ hồ thì dừng lại hỏi.

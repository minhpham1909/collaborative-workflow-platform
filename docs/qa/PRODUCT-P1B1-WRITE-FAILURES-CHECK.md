# P1b1 — Xung đột, mất quyền và mất phản hồi khi lưu

15/10/2026. Browser chạy native Workspace-only trên Mongo replica set/API riêng; 4 tài khoản thử. Không sử dụng Organization adapter, không ghi dữ liệu dev hoặc gửi thư.

## Ca kiểm tra đạt

1. Owner mở form sửa Task, một phiên khác cập nhật qua service thật. PATCH từ form cũ nhận 409; tiêu đề draft vẫn ở form và dữ liệu mới trên DB không bị ghi đè.
2. PATCH đã được API xác nhận 200 rồi phản hồi browser bị ngắt có chủ đích. DB có đúng nội dung đã lưu; form giữ nội dung, khoá gửi lại. Đóng theo hội thoại xác nhận và đọc lại thấy kết quả, không gửi lại PATCH.
3. Manager mở form, Owner hạ xuống Member trước khi lưu. PATCH nhận 403, DB không bị sửa và form giữ draft.
4. Member gửi yêu cầu mở lại Task Done. Task vẫn Done cho đến khi được duyệt.
5. Người gửi được bổ nhiệm Manager trong lúc yêu cầu đang chờ vẫn không có nút tự duyệt.
6. Owner thấy select trạng thái bị khoá khi có yêu cầu chờ; duyệt qua dialog có lý do thì Task thành todo, completedAt hiện tại được xoá.
7. Khi không còn yêu cầu chờ, Owner mở trực tiếp Done → in_progress qua dialog lý do; DB xác nhận trạng thái.

Light/VI1440 và Dark/EN375 PASS. Bước đọc lại sau mất phản hồi được bổ sung và chạy lại Light/VI. Console 409/403/net::ERR_FAILED là tình huống thử có chủ đích; không có pageerror. Script: FE/scripts/check-product-write-failures.mjs. Log: .local/p1b-*.log. Không thay đổi code sản phẩm: các ca hiện đạt với logic sẵn có.

## Giới hạn / bước kế tiếp P1b2

- Chưa nghiệm thu mất phản hồi của POST tạo mới (rủi ro tạo trùng), và các form Workspace/Project/comment.
- Chưa nghiệm thu mất toàn bộ membership/Guest access khi form hoặc Task panel đang mở; ca hiện tại là mất quyền quản lý sau demotion.
- Chưa chạy UI từ chối yêu cầu/cooldown 24h/quota 3 trong 7 ngày, parent archived trong lúc review và người gửi mất quyền trước review.
- Không tuyên bố draft tồn tại sau reload/đóng trình duyệt hoặc được bảo vệ mọi lịch sử điều hướng.
- Không chạy lại build/BE full suite vì chỉ thêm browser acceptance script và tài liệu. Không deploy.

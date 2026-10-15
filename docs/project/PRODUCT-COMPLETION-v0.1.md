# Hoàn thiện sản phẩm Workspace-only

Mốc bắt đầu: 15/10/2026. Core cleanup F2d2c đã qua scoped gates; chuyển trọng tâm sang sử dụng và nghiệm thu sản phẩm. Mỗi patch có kiểm thử phù hợp, commit/push riêng. Chưa deploy.

| Bước | Phạm vi | Điều kiện hoàn thành | Trạng thái |
| --- | --- | --- | --- |
| P0 | Dữ liệu mới và smoke | Giữ tài khoản thật; seed đúng dev27018; đủ trạng thái, vai trò; smoke web | Đạt scoped gate |
| P1 | Nghiệm thu thao tác nhiều tài khoản | Tạo/xem/sửa/huỷ; Manager/Member/Guest; mất quyền, CAS, pending reopen, archive/trash/restore; lỗi mạng và giữ draft | P1a đạt; P1b còn lại |
| P2 | Home và điều hướng | Gom filter + dạng xem; ưu tiên hành động, pin; giảm reload thủ công; bố cục gọn và dữ liệu thật | Chưa bắt đầu |
| P3 | Workspace/Team/cài đặt | Setup metadata, role, invitation, audit, quyền sở hữu; trạng thái rỗng/chỉ đọc/lỗi rõ ràng | Chưa bắt đầu |
| P4 | Board/Task/detail | Đọc/sửa thuận tiện, checklist/nhãn/hạn/comment/reopen/trash; tránh cuộn thừa | Chưa bắt đầu |
| P5 | My Tasks/lịch/Inbox | Hai dạng xem khác biệt thực chất; filter, tải thêm, back/return; notification target đã mất quyền | Chưa bắt đầu |
| P6 | Tổng nghiệm thu | Sáng/tối, desktop/mobile, focus/bàn phím, loading/empty/error; đối chiếu Stitch và người dùng nghiệm thu | Chưa bắt đầu |

Không gom thành một đợt redesign lớn. Vẫn dùng nền visual đã chọn; không thêm dữ liệu giả vào số liệu sản phẩm. Dữ liệu seed có nhãn [QA] và mô tả rõ là nghiệm thu. Khi test phát hiện lỗi chặn luồng, sửa ngay trong cụm và ghi bằng chứng.

## Dữ liệu và quyền truy cập thử

- Tài khoản chính: pepe19092003@gmail.com, giữ thông tin đăng nhập/Google và tài khoản cũ.
- Ba tài khoản thử Manager/Member/Guest dùng domain example.invalid; password ngẫu nhiên lưu riêng tại .local/workspace-acceptance/manifest.json (gitignored), không đưa vào docs/repo/log.
- 3 Workspace: hoạt động, rỗng, lưu trữ; 4 Project; 18 Task; checklist, nhãn, comment, notifications, pin; một Task trash 30 ngày.
- Dữ liệu tạo qua service hiện tại. Chỉ tạo account/session fixture ở lớp model; không phát minh lịch sử Task/audit hay dùng Organization adapter.
- Seed preview trước apply, chặn production/remote/27017/DB khác; không clear/merge business data. Manifest wx chặn concurrent/repeat; complete replay chỉ đọc. Partial run dừng để kiểm tra, không tự rollback/xoá hoặc retry sinh bản sao.
- Không bật SMTP/queue/purge/cleanup worker. Queue mới từ thao tác seed có thể tồn tại; chưa gửi. Thư xác minh/tài khoản cũ không bị xử lý.

## Kết quả P0

- Seed isolated + full BE integration: 137/137 PASS.
- Unit: 128 PASS, 23 DB suite skip trong unit invocation (DB đã chạy riêng).
- Preview dev: ready, đúng27018, unique indexes sẵn có; không apply indexes.
- Apply dev: complete; rerun complete writes0. Không reset hoặc migrate.
- Browser real dev: 7 điểm đọc của Owner + Board cho Manager/Member/Guest PASS, không mutation nghiệp vụ trong smoke. Ảnh tại .local/workspace-acceptance/screens. Đợi dữ liệu tải xong trước chụp, kiểm tra không overflow desktop và không pageerror.
- Mongo27018 dùng lại .local/mongodb-dev; API4000 và FE5173 hoạt động. Mongo hệ thống27017 không bị chạm.

P0 không chứng minh mọi thao tác đa tài khoản, phân trang dài, responsive/sáng tối hoặc khả năng chịu lỗi mạng. Những phần đó nằm P1–P6. Không đánh dấu sản phẩm hoàn chỉnh chỉ vì test kỹ thuật đạt.

15/10/2026: P1a [native write journey](../qa/PRODUCT-P1A-WRITE-JOURNEY-CHECK.md) đạt LightVI1440/DarkEN375. P1b form đang mở bị mất quyền/CAS/mất phản hồi/reopen vẫn cần nghiệm thu. P2 toolbar sẽ triển khai theo yêu cầu UI đã chốt, không coi P1 hoàn tất.

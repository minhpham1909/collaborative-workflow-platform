# P5c — Personal pagination và Calendar return

15/10/2026. Native Workspace-only, 64 Task được giao cùng ngày, API/Mongo/browser riêng. Không dev data/SMTP/workers/deploy.

## Sửa lỗi

Calendar giữ tháng/ngày qua URL nhưng trước đây quay về từ full Task chỉ tải12 mục. Dùng chung bộ nhớ geometry của My Tasks với namespace calendar theo user/query, App truyền userId rõ ràng. Khi chọn Full page trong panel, ghi anchor ID/offset/scrollY/số trang; quay lại đọc mới từng trang có kiểm quyền rồi khôi phục vị trí. Không lưu Task body/permission/response. Giới hạn20 vị trí/20 trang, xoá theo account-change; anchor thiếu dùng scrollY fallback. Query/token guard ngăn kết quả cũ áp dụng sau đổi filter.

## Kiểm chứng

- My Tasks và Calendar: auto mặc định12→24→36→48 rồi dừng sau3 trang thêm; manual tiếp60 mục, không trùng ID.
- My Tasks: giữ một cursor response bằng gate, đổi filter tới kết quả rỗng rồi trả response cũ. Danh sách vẫn rỗng theo filter mới, không bị append64 mục cũ.
- Calendar: tắt auto/observer trước phần đo return để cô lập restoration; mở Task ở trang5 qua panel→full page, đổi tiêu đề ở service rồi quay về. Đọc60 mục mới, title cập nhật, ngày vẫn chọn đúng và anchor lệch dưới4px so với thời điểm trước khi bấm Full page. Không đo theo điểm trước khi mở panel vì click/focus có thể tự cuộn background.
- Browser LightVI1440/DarkEN375 PASS, không pageerror.
- P5b Calendar/Inbox smoke chạy lại Light sau thay đổi Calendar; giữ ngày/tháng và notification unavailable/redaction.
- FE35/35 PASS; build/budget PASS initial423918/425000 bytes.

Script FE/scripts/check-product-personal-pagination.mjs; log .local/p5c-*.log. Không thay BE.

## Chuyển P6

P5a–P5c đạt các ca đã ghi. P6 giữ tổng nghiệm thu visual/keyboard, native regression, dài/empty/error và các race bổ sung (gồm Calendar filter race độc lập, anchor bị xoá và toàn bộ browser history). Không tuyên bố đã bao phủ mọi tổ hợp hoặc sẵn sàng deploy.

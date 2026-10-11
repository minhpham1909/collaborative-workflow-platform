# Kiểm thử web trước khi nghiên cứu deploy

11/10/2026. Theo yêu cầu trực tiếp: ưu tiên web ổn định rồi mới bàn deploy/CI-CD. Gate12/12S là technical local scope, không thay nghiệm thu sử dụng web.

## W0 — Runtime local: đã chuẩn bị

FE5173 trả200; API4000 health/ready trả200. Khởi động database project27018 bằnglauncher hiện có, dùng lại.local/mongodb-dev; APIserver riêng. Không khởi động mail/moderation/retention worker, không sửa business collections hoặcbackfill; không đụng Mongo hệ thống27017.

## W1 — Negative flows và danh sách lớn: đạt lượt này

- check-network-flows: dropped/503 responses sau commit Workspace/Project/Task/Comment; form vàkeyboard không gửi lại; draft giữ nguyên; cancel/readback nhìn dữ liệu; chỉ1record mỗi thao tác. API/Mongo fixture riêng, không mail/provider.
- check-picker-flows: member/Workspace>20 records, server search/paging/stale response/error/retry, giữ selected identity, reset/counts/responsive và mấtmembership khi đang chọn. Fixture riêng.
- check-stitch-workspace-team: fullVi-En Team/invitations/Kick/leave/transfer/Ban/Unban/Archived cleanup/retry/5width; assignee/history/comments và scopes đúng; không thực thiworker.

Hai script network/picker dùng tên nút/filter cũ (+TạoWorkspace, +TạoProject, Bộlọc/Lưu). Cập nhật selectors theo UIhiện tại, scope đúng dialog cho submit. Giữ assertions API/recordcount/blockedwrites; không đổi product để né test. Các lượt lỗi selector không được tínhpass.

## W2 — Nghiệm thu sử dụng web: còn tiếp

Kiểm xuyên cụm Auth → Home/Org/Workspace → Project/Task → MyTasks/Inbox/Trash, theo Owner/Admin/Manager/Lead/Member/Assignee/Guest. So sánh kết quả hiển thị với quyền/dữ liệu hiện tại, kiểm loading/empty/errors/read-only, Back/Forward/drafts, Vi-En vàdesktop/mobile. Dùng tài khoản/dữ liệu test tách riêng cho CRUD; luồng Google/email thật cần tách bằng chứng provider khỏi fixture.

Ghi lỗi tái hiện, tác động, bước sửa và kiểm lại; ưu tiên lỗi mất dữ liệu/quyền/lưu trùng vàblocker luồng trước visual polish. Không gọi web đã ổn chỉ vì build/test scripts xanh. Không xử lý queue cũ hoặc dùng tài khoản thật để ghi dữ liệu hàng loạt.

## W3 — Điều kiện chuyển sang deploy

Các luồng chính không còn blocker tái hiện, lỗi phát hiện đã sửa vàregression, kết quả vàđiểm còn hạn chế được ghi rõ. Khi đạt nghiệm thu web mới tiếp danh sách môi trường trong S12-REMAINING-WORK.md. Chưa triển khai CI/CD hoặc deploy ởlượt này.

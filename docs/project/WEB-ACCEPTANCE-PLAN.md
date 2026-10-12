# Kiểm thử web trước khi nghiên cứu deploy

11/10/2026. Theo yêu cầu trực tiếp: ưu tiên web ổn định rồi mới bàn deploy/CI-CD. Gate12/12S là technical local scope, không thay nghiệm thu sử dụng web.

## W0 — Runtime local: đã chuẩn bị

FE5173 trả200; API4000 health/ready trả200. Khởi động database project27018 bằnglauncher hiện có, dùng lại.local/mongodb-dev; APIserver riêng. Không khởi động mail/moderation/retention worker, không sửa business collections hoặcbackfill; không đụng Mongo hệ thống27017.

## W1 — Negative flows và danh sách lớn: đạt lượt này

- check-network-flows: dropped/503 responses sau commit Workspace/Project/Task/Comment; form vàkeyboard không gửi lại; draft giữ nguyên; cancel/readback nhìn dữ liệu; chỉ1record mỗi thao tác. API/Mongo fixture riêng, không mail/provider.
- check-picker-flows: member/Workspace>20 records, server search/paging/stale response/error/retry, giữ selected identity, reset/counts/responsive và mấtmembership khi đang chọn. Fixture riêng.
- check-stitch-workspace-team: fullVi-En Team/invitations/Kick/leave/transfer/Ban/Unban/Archived cleanup/retry/5width; assignee/history/comments và scopes đúng; không thực thiworker.

Hai script network/picker dùng tên nút/filter cũ (+TạoWorkspace, +TạoProject, Bộlọc/Lưu). Cập nhật selectors theo UIhiện tại, scope đúng dialog cho submit. Giữ assertions API/recordcount/blockedwrites; không đổi product để né test. Các lượt lỗi selector không được tínhpass.

## W2 — Browser journey đạt; nghiệm thu thực tế còn tiếp

Đãchạy4hànhtrìnhVi/En×1440/375 trênbuiltpreview tuần tự, cùngHome/Org/ManageAudit/Workspace regressionsPASS. [Kết quảW2](../qa/WEB-ACCEPTANCE-W2-CHECK.md). Lượt4browserssong song cóERR_INSUFFICIENT_RESOURCES/modulefetchfailure; giữrecord vàtách khỏibusinessacceptance, chưa loadtest hoặcuserUAT/provider thật.

Kiểm xuyên cụm Auth → Home/Org/Workspace → Project/Task → MyTasks/Inbox/Trash, theo Owner/Admin/Manager/Lead/Member/Assignee/Guest. So sánh kết quả hiển thị với quyền/dữ liệu hiện tại, kiểm loading/empty/errors/read-only, Back/Forward/drafts, Vi-En vàdesktop/mobile. Dùng tài khoản/dữ liệu test tách riêng cho CRUD; luồng Google/email thật cần tách bằng chứng provider khỏi fixture.

Ghi lỗi tái hiện, tác động, bước sửa và kiểm lại; ưu tiên lỗi mất dữ liệu/quyền/lưu trùng vàblocker luồng trước visual polish. Không gọi web đã ổn chỉ vì build/test scripts xanh. Không xử lý queue cũ. Ghi dữ liệu trên tài khoản thật cần phạm vi được người dùng cấp phép như W2b bên dưới.

## W2b — Tài khoản chính và dữ liệu dev được cấp phép: đạt trong scope

12/10/2026, người dùng yêu cầu seed dữ liệu giả cho pepe19092003@gmail.com; nhiều account/role để lượt sau. Đã tạo bộ `[QA-PEPE]` với 1 Studio/4 Workspace/5 Project/30 Task/17 comment/24 notification mô phỏng. Browser local 1440px 19 nhóm PASS; FE21/21; seed idempotent, không thay Task cũ, credentials/settings hoặc xử lý outbox cũ. QA EmailOutbox0, giữ 11 notification chưa đọc và 2 Task trash để thử tiếp. [Kết quả và giới hạn](../qa/WEB-ACCEPTANCE-ACCOUNT-QA.md).

Đã cấp phép ghi lên bộ QA riêng trên dev27018; không chạy provider/SMTP/purge/moderation worker hoặc backfill legacy. Session test dùng riêng và thu hồi finally; không thay password/login người dùng. Thông báo một tài khoản dùng fixture rõ nhãn mô phỏng; chưa xác nhận phát notification giữa nhiều actor, role thực tế hoặc password/Google/provider trong lượt này. Tiếp nghiệm thu bằng dữ liệu đã giữ, rồi setup nhiều account khi người dùng yêu cầu; chưa chuyển deploy.

## W3 — Điều kiện chuyển sang deploy

Các luồng chính không còn blocker tái hiện, lỗi phát hiện đã sửa vàregression, kết quả vàđiểm còn hạn chế được ghi rõ. Khi đạt nghiệm thu web mới tiếp danh sách môi trường trong S12-REMAINING-WORK.md. Chưa triển khai CI/CD hoặc deploy ởlượt này.

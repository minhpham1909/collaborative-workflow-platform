# W2b — Dữ liệu QA trên tài khoản chính

12/10/2026. Phạm vi được người dùng cấp phép: thêm dữ liệu giả và kiểm luồng trên `pepe19092003@gmail.com` trong dev. Kiểm nhiều tài khoản và phân quyền sẽ làm ở lượt riêng. Browser local 1440px PASS 19 nhóm kiểm tra; chưa phải nghiệm thu toàn hệ thống.

## Bộ dữ liệu để thử trực tiếp

Đăng nhập bằng tài khoản trên, tìm `[QA-PEPE]` ở Trang chủ hoặc Tổ chức & Studio. Mở Workspace sản phẩm → Workflow website để thử Board/Task. Dữ liệu được giữ lại sau kiểm thử.

| Cụm | Dữ liệu |
| --- | --- |
| Studio | 1 Studio với 1 Workspace trực thuộc; vai trò hiện tại của tài khoản được giữ nguyên ở các không gian cũ |
| Workspace | 4 nhóm: sản phẩm, thiết kế thuộc Studio, Archived, nhóm mới rỗng |
| Project | 5 dự án: chính, Archived riêng, rỗng, thiết kế, Active dưới Workspace Archived |
| Task | 29 Task từ seed + 1 Task tạo qua form = 30; đủ todo/doing/done, ưu tiên 3 mức, chưa giao người, quá hạn/hôm nay/sắp tới/không hạn |
| Nội dung | Mô tả Unicode có dấu/emoji; Workspace có mô tả dài; 3 nhãn Project, trong đó 1 nhãn Archived giữ lịch sử |
| Checklist & reopen | Checklist 3 mục; một yêu cầu mở lại đang chờ, một yêu cầu bị hủy do Project Archived |
| Bình luận | 15 bình luận phân trang từ seed; thêm dữ liệu QA khi kiểm form. Không tạo tác giả giả hoặc tài khoản khác |
| Thông báo | 24 thông báo mô phỏng thuộc 4 loại thay đổi; có đã đọc/chưa đọc, phân trang và mục không khả dụng khi Task ở thùng rác |
| Thùng rác | Ban đầu 3 Task; sau phục hồi còn 2, giữ lịch dọn 30 ngày do nghiệp vụ delete thông thường |
| Team / Guest invitation | Một thành viên thực là tài khoản chính; Workspace LINK invite và Project Guest LINK invite, chưa thêm người khác |
| Settings | Dùng hồ sơ, email preferences và liên kết Google hiện có; không đổi mật khẩu, email, xác minh hoặc locale tài khoản |

Thông báo do `Notification.create` tạo fixture với actorId null và tên `[QA-PEPE] Đồng đội mô phỏng`. Các thao tác nghiệp vụ còn lại chạy qua service với quyền và phiên của tài khoản thật. Thông báo tự gửi cho chính người thao tác bị hệ thống loại trừ, nên fixture này kiểm render/read theo quyền hiện tại; **không chứng minh phát sự kiện giữa nhiều người hoặc gửi email thật**.

Shared Projects, lời mời nhận từ người khác, Ban/kick, đổi Owner/Manager/Lead, duyệt yêu cầu của người khác và nhật ký của các thao tác đó sẽ cần tài khoản bổ sung. Giữ các màn này ở trạng thái rỗng đúng nghiệp vụ; không bịa membership, quyền hay sự kiện để lấp màn hình.

## Cách chạy có kiểm soát

Từ thư mục gốc, với Node 24 và API4000/FE5173 đang chạy:

```powershell
node --env-file=BE/.env BE/scripts/seed-qa-account.mjs --apply --email pepe19092003@gmail.com
node --env-file=BE/.env FE/scripts/check-seeded-account.mjs --apply
```

Browser runner cần Playwright có sẵn; có thể chỉ định `WORKFLOW_PLAYWRIGHT_MODULE` và `WORKFLOW_BROWSER_EXECUTABLE`. Seed mặc định không chạy nếu thiếu `--apply`, sai email, tài khoản chưa xác minh, ngoài development hoặc URI không phải localhost/127.0.0.1:27018/workflow_dev. Tạo phiên QA riêng, thu hồi trong finally; không thay mật khẩu hoặc phiên hiện có. Seed có manifest `.local/qa-pepe/manifest.json`, chạy lại không reset dữ liệu đã sửa và không thêm bản ghi trùng. Manifest dở dang cần xem xét rồi dùng `--resume`; không tự xóa hoặc tái tạo cả dataset.

Browser kiểm bằng UI với API local thật, không intercept sang API/DB fixture. Chỉ ghi lên tài nguyên `[QA-PEPE]` trong manifest, có khoảng nghỉ giữa các cụm để giữ nguyên limiter. Comment mới tạo qua UI được sửa rồi xóa đúng comment đó; các bình luận seed được giữ lại. Một Task QA được đưa lại vào thùng rác nếu cần để kiểm mục không khả dụng, rồi phục hồi; không phát lại notification cũ. Không tự retry mutation.

## Bằng chứng và giới hạn

Manifest, báo cáo browser và ảnh nằm trong `.local/qa-pepe/`, được gitignore. Không chứa access/refresh token trong báo cáo. Dữ liệu tài khoản và Task cũ được đối chiếu trước/sau; state/attempts hàng đợi cũ phải giữ nguyên; QA-scoped EmailOutbox phải bằng 0. Không chạy SMTP, moderation, retention worker, backfill, purge hoặc tác động Mongo hệ thống27017. Đây là dữ liệu dev phục vụ kiểm thử, không phải dữ liệu sản xuất.

FE unit regression: 21/21 PASS. Các lỗi selector/timing trong lúc dựng runner không tính PASS: tìm mã `-1` là khớp một phần nên có cả `-10…-19`; comment cần chờ load/server commit; checkbox controlled cần chờ PATCH; chọn filter dùng accessible name thực tế; email Settings xuất hiện cả ở summary và form nên scope đúng vùng. Không sửa nghiệp vụ hoặc nới limiter để né test. Chưa có bằng chứng cần đổi product code từ các lỗi runner này.

Lượt browser cuối PASS, thời điểm 12/10/2026 07:27 giờ Việt Nam: 30 Task, 17 bình luận, 24 notification (11 chưa đọc), 2 Task còn trong thùng rác; QA EmailOutbox = 0. Account credentials/profile/email preferences/locale và Task cũ giữ nguyên; state/attempts hàng đợi cũ giữ nguyên; không có pageerror trong hành trình. Chạy lại seed: số liệu không tăng, outboxAdded = 0.

19 nhóm kiểm đã đạt:

1. Home tìm và hiển thị thẻ QA.
2. Board 3 trạng thái; phân trang 12 → 16 todo trong lượt cuối.
3. Mã Task tìm khớp một phần, đúng 11 kết quả bao gồm Task đích cho mã kết thúc -1.
4. Sửa Task và đọc lại kết quả DB.
5. Bình luận phân trang, tạo → sửa → xóa chính bình luận vừa tạo; tổng còn nguyên.
6. My Tasks tìm Task, mở chi tiết, đổi status và quay lại thấy trạng thái hiện tại.
7. Inbox 24 mục, phân trang, đọc theo ID, mục bị che khi Task ở thùng rác.
8. Phục hồi Task, không phát lại notification.
9. Yêu cầu mở lại của chính người dùng: chờ duyệt, không được tự duyệt.
10. Project Archived chỉ đọc, không có Create Task.
11. Project rỗng giữ đúng empty state.
12. Project Active dưới Workspace Archived kế thừa chỉ đọc.
13. Workspace collection và mở/thu gọn mô tả dài.
14. Studio hiển thị Workspace trực thuộc.
15. Lọc ưu tiên/quá hạn khớp DB; Done không bị coi quá hạn.
16. Tạo Task qua UI: self-assignee, high priority, nhãn, Unicode rich text và deadline UTC.
17. Lọc ngày deadline 02/01/2030 giờ Việt Nam đúng Task đã tạo; 09:30 GMT+7 lưu 02:30 UTC.
18. Tick checklist có PATCH thành công, cảnh báo Done khi checklist chưa đủ, hủy giữ in_progress, lịch sử ghi nhận cập nhật.
19. Settings summary/profiles, preferences và security hiển thị đúng; chỉ đọc trong lượt này.

Không mở chức năng mới hoặc sửa product code trong increment này. Commit gồm helper seed, browser QA và tài liệu; dữ liệu Mongo và các chứng cứ local không nằm trong Git. Các thao tác authentication qua password/Google, email provider, nhiều role và thiết bị khác không được suy từ phiên QA ở lượt này. Chưa chuyển sang deploy/CI-CD.

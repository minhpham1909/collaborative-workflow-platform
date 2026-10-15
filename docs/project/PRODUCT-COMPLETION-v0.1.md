# Hoàn thiện sản phẩm Workspace-only

Mốc bắt đầu: 15/10/2026. Core cleanup F2d2c đã qua scoped gates; chuyển trọng tâm sang sử dụng và nghiệm thu sản phẩm. Mỗi patch có kiểm thử phù hợp, commit/push riêng. Chưa deploy.

| Bước | Phạm vi | Điều kiện hoàn thành | Trạng thái |
| --- | --- | --- | --- |
| P0 | Dữ liệu mới và smoke | Giữ tài khoản thật; seed đúng dev27018; đủ trạng thái, vai trò; smoke web | Đạt scoped gate |
| P1 | Nghiệm thu thao tác nhiều tài khoản | Tạo/xem/sửa/huỷ; Manager/Member/Guest; mất quyền, CAS, pending reopen, archive/trash/restore; lỗi mạng và giữ draft | P1a/P1b1/P1b2 đạt phạm vi Task; còn biến thể P3/P4 |
| P2 | Home và điều hướng | Gom filter + dạng xem; ưu tiên hành động, pin; giảm reload thủ công; bố cục gọn và dữ liệu thật | P2a toolbar đạt; còn nghiệm thu tổng thể |
| P3 | Workspace/Team/cài đặt | Setup metadata, role, invitation, audit, quyền sở hữu; trạng thái rỗng/chỉ đọc/lỗi rõ ràng | P3a–P3d đạt luồng chính; hậu kiểm P6 còn lại |
| P4 | Board/Task/detail | Đọc/sửa thuận tiện, checklist/nhãn/hạn/comment/reopen/trash; tránh cuộn thừa | P4a–P4c đạt luồng chính; hậu kiểm P6 còn lại |
| P5 | My Tasks/lịch/Inbox | Hai dạng xem khác biệt thực chất; filter, tải thêm, back/return; notification target đã mất quyền | P5a/P5b đạt phạm vi; P5c personal paging còn lại |
| P6 | Tổng nghiệm thu | Sáng/tối, desktop/mobile, focus/bàn phím, loading/empty/error; đối chiếu Stitch và người dùng nghiệm thu | Chưa bắt đầu đợt nghiệm thu |

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

15/10/2026: P2a gom filter và dạng xem cho 5 màn hình; icon có nhãn trợ năng/vùng bấm 44px, sửa tương phản selected hover. [QA và phạm vi](../qa/PRODUCT-P2A-FILTER-VIEW-CHECK.md). P1b vẫn mở; chưa đóng P2/P5 hoặc deploy.

15/10/2026 — Sửa khung navigation: grid/sticky header, stable scrollbar gutter, giữ pins khi revalidate, prefetch code theo ý định điều hướng. [QA/phạm vi](../qa/SHELL-NAVIGATION-STABILITY-CHECK.md). Hash route không reload document trong browser test; dữ liệu từng trang vẫn tải/kiểm quyền. P1b còn mở; chưa deploy.

15/10/2026 — My Tasks/Inbox đổi từ density-only sang Dạng thẻ / Danh sách có cấu trúc khác biệt, giữ dữ liệu và thao tác. [QA/phạm vi](../qa/CARD-LIST-LAYOUT-CHECK.md). P1b và tổng nghiệm thu P2–P6 còn lại; chưa deploy.

15/10/2026 — [P1b1 write failures/reopen](../qa/PRODUCT-P1B1-WRITE-FAILURES-CHECK.md) đạt: CAS409 giữ draft, PATCH commit mất phản hồi khoá gửi lại/đọc kết quả, Manager demotion mid-form403; Member request/không self-review sau promotion, Owner approve/direct reopen. P1b2 còn POST-create response loss, các form khác, mất membership và reopen reject/cooldown/archive race. Không đổi code sản phẩm hoặc dữ liệu dev.

15/10/2026 — [P1b2](../qa/PRODUCT-P1B2-CREATE-ACCESS-CHECK.md) đạt: POST commit mất phản hồi không tạo trùng/đọc lại; membership removal mid-form404; UI reject/cooldown; store-clock quota và expiry7ngày; parent archived chặn stale approval. Sửa copy Lead trong label picker. Tiếp P3 Workspace/Team/settings, kèm failure cases của form Workspace/Project; P4 bổ sung Guest/requester-loss. Không tuyên bố toàn bộ race đã được kiểm thử.

15/10/2026 — [P3a Workspace settings](../qa/PRODUCT-P3A-WORKSPACE-SETTINGS-CHECK.md): sửa thiếu lối phục hồi khi uncertain/initial load error, chỉ hiện nút trong lỗi và giữ confirm discard. Native browser LightVI1440/DarkEN375 metadata/cancel/CAS/demotion/copydraft/response-loss/retry PASS. Tiếp P3b Team/invitations/ownership/audit/lifecycle và email preferences. Không ghi dữ liệu dev/deploy.

15/10/2026 — [P3b Team/lifecycle](../qa/PRODUCT-P3B-TEAM-LIFECYCLE-CHECK.md): UI multi-Manager, Manager LINK creation, Owner transfer/oldOwner Member, remove Member, role-audit, archive/unarchive giữ Project states; service admission/revocation. LightVI1440/DarkEN375. Tiếp P3c email preferences/Ban/error cases; chưa đóng P3, không deploy.

15/10/2026 — [P3c security/email](../qa/PRODUCT-P3C-SECURITY-EMAIL-CHECK.md): sửa preview lỗi bị khoá nhầm như write uncertain; browser email override/reset isolation, Ban/unban/no auto-membership/assignee retention, stale role409 và lost Ban response khoá repeat đạt LightVI1440/DarkEN375. Không cleanupworker/SMTP/devdata. Còn ownership/invitation error matrix và cleanup/pagination riêng; P3 chưa đóng toàn diện.

15/10/2026 — [P3d dialog errors](../qa/PRODUCT-P3D-DIALOG-ERRORS-CHECK.md): TeamAction5xx hiển thị uncertain đúng; EMAIL invitation commit502/no duplicate/readback, Manager lostrole403, ownershipCAS409 và lostresponse/reconcile PASS LightVI1440/DarkEN375. FE35/build PASS. Tiếp P4 Board/Task; giữ delivery/cleanup/pagination/race bổ sung ở P6, không coi các ca chưa chạy là đạt.

15/10/2026 — [P4a access/checklist](../qa/PRODUCT-P4A-TASK-ACCESS-CHECKLIST-CHECK.md): Guest revoked panel comment404/draft, freshread redacted; structure vsassigneetick; incomplete Done cancel/confirm; requester membership removed cancels request, stale approval409 giữDone. LightVI1440/DarkEN375. Tiếp P4b labels/priority/deadline/comments/error/layout. Không code sản phẩm/devdata/deploy.

15/10/2026 — [P4b metadata/comments](../qa/PRODUCT-P4B-METADATA-COMMENTS-CHECK.md): khoá sửa nội dung khi uncertain, giữ huỷ/phục hồi Task ngoài fieldset; metadata/UTC/archivedlabel, comment lostresponse no-duplicate/author-only/CAS/harddelete và longcontent4widths LightVI/DarkEN PASS. P1b1 rerun + FE35/buildPASS. Tiếp P4c Project/label management và visual states; chưa fullP4.

15/10/2026 — [P4c Project management](../qa/PRODUCT-P4C-PROJECT-MANAGEMENT-CHECK.md): descriptionCAS/lostresponse recovery, labelUI duplicate correction/archive/unarchive, Member/archivedreadonly và keyboard focus/Escape PASS LightVI/DarkEN. Bỏ empty action spacing/mobile oddtab fullrow. FE35/build PASS. Tiếp P5 MyTasks/calendar/Inbox; P6 giữ fullvisual/keyboard/drag-drop/longdata, không đánh dấu chưa chạy là đạt.

15/10/2026 — [P5a MyTasks return](../qa/PRODUCT-P5A-MY-TASKS-RETURN-CHECK.md): thêm geometry/page-count only return memory theo user/query, đọc mới2pages và giữ anchor sau Task/fullpage/panel; page503 giữrows/manualretry. LightVI1440/DarkEN375, FE35/buildPASS. Tiếp P5b automaticlazy/Inbox unavailable/Calendar return; không cache Task response/devdata/deploy.

15/10/2026 — [P5b Calendar/Inbox](../qa/PRODUCT-P5B-CALENDAR-INBOX-CHECK.md): Inbox auto3page/manual/error/dedup/fallback LightDark; Calendar selected month/day fullTask return và deleted/accesslost notification redaction/readack LightVI1440/DarkEN375 PASS. Không code sản phẩm. Tiếp P5c MyTasks/Calendar automatic paging và Calendar multipage return/filter race.

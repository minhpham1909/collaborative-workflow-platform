# F2d2c — Current event, mail and moderation contracts

Ngày: 15/10/2026.

## Hoàn thành

- Native Notification/EmailOutbox bỏ organizationId, organizationInvitationId và payload organizationName. Notification không nhận category organization_invitation.
- Native AccessBan/ModerationAction bỏ organizationId; scope chỉ workspace/project.
- Schema cũ tách sang historical fixture, model tên riêng và cùng guard loopback test DB; các flow lịch sử không làm nới schema hiện tại.
- Inbox query/cutoff chỉ nhận category hiện tại; legacy category chỉ trong historical adapter đã được giới hạn test DB. Dữ liệu Org raw nếu gặp trong Inbox vẫn được che và đánh dấu không khả dụng.
- Provider bỏ template Organization và từ chối purpose không hỗ trợ trước capture file hoặc SMTP. Historical template chỉ còn ở test-support.
- Workspace invitation tạo notification bằng payload allowlist workspaceName/actorDisplayName, không chuyển tiếp toàn bộ payload queue cũ.
- FE bỏ filter, nội dung và CTA chấp nhận Org invitation. URL filter cũ normalize về all.
- Chuyển browser Inbox view journey sang fixture Workspace-only, không tạo Org nữa.

## Kiểm thử

- Full isolated Mongo integration: 136/136 PASS.
- Unit BE/FE: 127 PASS, 22 DB suites skip trong invocation unit; các suite DB đã chạy ở trên.
- Native schema từ chối Org metadata/scope; Inbox từ chối Org filter; provider từ chối Org/unknown purpose trước gửi hoặc capture.
- Browser Inbox Light/Dark: hai chế độ, năm chiều rộng, VI→EN, tải thêm, giữ vị trí khi trở về từ Task/detail, preference storage bị chặn, filter URL cũ và không có option Org: PASS.
- FE build + budget PASS: initial 421434/425000 bytes, gzip 132289.

Lượt đầu có ba lỗi historical fixture sau khi siết schema: comment audit vẫn import native model, notification từ historical payload có organizationName null; đã sửa bằng import fixture và allowlist payload, chạy lại full integration PASS. Unit nested payload phải kiểm validation rejection (StrictModeError nằm trong ValidationError), đã sửa kỳ vọng và chạy lại PASS. Browser đầu không chạy vì Vite dừng; đã resume Vite rồi chạy lại cả hai theme PASS.

## Bước tiếp

Chuyển sang chuẩn bị dữ liệu Workspace-only mới và kiểm thử web nhiều tài khoản Owner/Manager/Member/Guest, sau đó sửa UX theo từng cụm. Test kỹ thuật đạt chưa đồng nghĩa người dùng đã nghiệm thu sản phẩm. Các hook adapter/deny và query loại trừ raw legacy records là rào an toàn, không phải nghiệp vụ Organization còn mở. Tài liệu lịch sử và các journey cũ khác chưa được coi là acceptance hiện tại.

Không đổi collections/index trên dev, không reset/seed trong patch này; không gửi SMTP, xử lý queue cũ, chạy dev cleanup/purge worker hoặc deploy.

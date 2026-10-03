# Avatar, file storage và tài nguyên Workspace

Ngày nghiên cứu: 03/10/2026. Chủ dự án đã chốt Google sign-in ngay bản đầu và thông báo chung do Workspace Owner đăng/ghim. Provider/quota/file scope/kho tài nguyên và giới hạn description dưới đây còn là đề xuất; chưa tạo tài khoản cloud, upload hoặc cấu hình thanh toán.

## 1. Avatar Google và tài khoản

Không có cơ chế lấy avatar đáng tin chỉ từ địa chỉ Gmail được nhập. Sau Google sign-in, BE verify credential; profile có thể có picture URL nhưng không được bảo đảm. Đề xuất lưu URL Google vào avatar của User, không tải ảnh về bucket; URL thiếu/lỗi dùng chữ cái đầu. Refresh URL khi đăng nhập Google, không tự ghi đè displayName người dùng đã sửa. UI xử lý URL lỗi và không coi ảnh là bằng chứng danh tính. [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect).

Google identity xác định bằng provider + sub, không bằng avatar/email. Không auto-merge tài khoản email/mật khẩu chỉ vì cùng email; yêu cầu đăng nhập tài khoản hiện có và xác nhận liên kết. BE verify chữ ký/issuer/audience/expiry và anti-replay theo flow được chọn, rồi tạo phiên ứng dụng theo auth design. Google credential không thay quyền Workspace. Google-only không cần passwordHash; không cho recovery âm thầm tạo local password. Policy thêm password/unlink provider còn cần thiết kế trước code.

Verified email có nuance: Gmail hoặc email_verified kèm hd phù hợp có thể được Google xác nhận; email bên thứ ba không có hd cần app verification/challenge nếu chưa verified. Terms vẫn phải được chấp nhận khi tạo User mới qua Google, giữ invitation intent. [Google server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Chỉ scope identity/profile/email; không xin Google Drive quyền để lưu Task files. Avatar URL là external image, không có upload avatar riêng ở giai đoạn này; fallback vẫn dùng chữ cái.

## 2. Provider storage khảo sát

| Provider | Điểm phù hợp | Điều cần tính |
|---|---|---|
| Cloudflare R2 Standard | Object storage qua S3 API; phù hợp Express tự quản auth/quyền; signed upload/download; không phí egress trực tiếp từ R2 | 10 GB-month free storage/tháng cùng allowance requests; vượt allowance tính storage/operations, không phải mọi thứ miễn phí |
| Supabase Storage | Private buckets và signed URL; dashboard/file management có sẵn | Free 1 GB storage, max upload 50 MB theo bảng hiện tại; auth/RLS cần map với Express/Mongo hoặc dùng BE cấp quyền, không tự kế thừa Mongo membership |

R2 Standard sau allowance: $0.015/GB-month, Class A $4.50/million requests, Class B $0.36/million; pricing áp dụng cấp usage provider, không phải mỗi Workspace được free riêng. Supabase là phương án dự phòng nếu ưu tiên hệ sinh thái quản lý của họ. Giá có thể đổi, phải kiểm lại khi tạo tài khoản. [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Supabase pricing](https://supabase.com/pricing), [Supabase buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Khuyến nghị R2 làm ứng viên ưu tiên cho stack hiện tại, chưa chọn mua/triển khai. Storage adapter tránh hard-code vendor vào business services. Không bắt buộc host BE/FE trên Cloudflare để dùng R2.

## 3. Chia dữ liệu file và metadata

MongoDB lưu metadata, quyền và quan hệ. Binary file đặt ở private object storage, không Mongo document/base64 hoặc thư mục upload trên BE production.

Đề xuất `files`: `_id, workspaceId, projectId?, taskId?, uploadedBy, context(task_attachment/workspace_document), provider, bucket, objectKey, originalName, detectedMimeType, sizeBytes, checksum?, state, uploadExpiresAt?, deletedAt, createdAt, version`. objectKey do BE sinh bằng ID ngẫu nhiên; tên gốc chỉ để hiển thị, không dùng làm đường dẫn. Parent/context do BE xác định và đối chiếu quyền. Không trả bucket credentials hoặc signed URL lâu dài trong metadata.

Storage dùng một bucket private mỗi môi trường, prefix ví dụ `workspaces/{workspaceId}/files/{fileId}`. Prefix không phải ACL; quyền thực nằm trong BE. Không tạo bucket cho từng User/Workspace trừ khi có nhu cầu vận hành cụ thể.

Task attachment thuộc một Task, xem cùng quyền Task; Task xóa làm attachment unavailable ngay. Workspace documents không phụ thuộc Task, có thể gắn Project để phân loại nhưng vẫn quyền Workspace. Bản đầu đề xuất mỗi object có một context sở hữu; không dedup/chia một object cho nhiều Task để tránh lifecycle phức tạp.

## 4. Upload, download và quota

Đề xuất ban đầu:

| Hạng mục | Giới hạn sản phẩm đề xuất, chưa duyệt |
|---|---|
| Mỗi file Task/Workspace | 25 MiB = 26.214.400 bytes |
| Mỗi Task | Tối đa 10 attachment đang khả dụng |
| Tổng mỗi Workspace | 1 GiB = 1.073.741.824 bytes, dùng chung Task files + documents |
| Mô tả Workspace | Tối đa 20.000 ký tự hiển thị |
| Mô tả Project | Tối đa 10.000 ký tự hiển thị |

Không yêu cầu tối thiểu description dài; ngắn/rỗng vẫn được. Bộ đếm không tính markup. Provider có thể cho file lớn hơn nhưng sản phẩm dùng quota nhỏ để kiểm soát chi phí; không lấy provider maximum làm app limit. Khả năng 1 GiB/Workspace không bảo đảm account cloud miễn phí nếu nhiều Workspace.

Upload: BE authenticate/authorize → reserve quota/count atomically → tạo upload record → nhận file ở staging → kiểm kích thước/MIME thực/type allowlist và scan → ready/publish. Ready mới xem/tải; mất quyền/Archived/Task deleted lúc finalize thì hủy và cleanup. Dùng staging objectKey và final objectKey khác nhau để URL PUT cũ không ghi đè object đã publish. Upload chưa xong hết hạn được dọn, release reservation. Quota tính used + reserved; không chỉ count documents rồi cấp URL khi hai request đồng thời.

Private download: BE kiểm quyền/availability/scan rồi cấp signed URL ngắn hạn hoặc proxy theo mức yêu cầu. Signed URL là bearer, có thể dùng lại đến expiry, không thu hồi tức thì chỉ vì membership đổi. Nếu cần mọi lần download kiểm quyền ngay, dùng proxy/authorization gateway; link đã cấp và dữ liệu đã tải không thể thu hồi tuyệt đối. [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

Signed PUT không tự bảo đảm content thực đúng MIME/size hoặc budget không bị lạm dụng; finalize inspection chỉ chặn publish, không ngăn upload quá lớn tiêu tốn storage trước đó. Chọn upload proxy có giới hạn stream hoặc cơ chế enforce size phía storage đã kiểm chứng; không dựa vào FE. Trước public release phải chọn scan/quarantine và worker cleanup cụ thể, không giả checkbox có nghĩa đã quét. Allowlist đề xuất PDF/TXT/CSV/DOCX/XLSX/PPTX/JPEG/PNG; không HTML/SVG/executable/archive/video ở bản đầu nếu chưa đặc tả. [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

### Quyền file đề xuất

- Workspace members xem/tải ready file trong phạm vi còn quyền; không có URL public vĩnh viễn.
- Task upload/remove: Owner hoặc Task Creator trong Project Active, giữ nguyên Assignee-only status. Nếu muốn Assignee upload bằng chứng hoàn thành, cần duyệt quyền bổ sung, không tự mở từ việc có storage.
- Workspace documents: Member được thêm; Creator tài nguyên hoặc Owner sửa/xóa. Project-linked document ghi theo Active gate; standalone resource không tự readonly khi một Project khác archive.
- Xóa logical file/resource ngắt truy cập ngay; physical delete job/retry giải phóng object, quota không giải phóng trước khi object đã dọn theo chính sách. Pending/deleted objects cũng tính budget vận hành. Retention/purge ngày cụ thể còn mở.

## 5. Kho tài nguyên Workspace

Đề xuất tab “Tài nguyên / Resources” gồm Link và File. Có search theo tên, lọc loại/Project, tags đơn giản và sắp mới tạo trước. Link như Figma/GitHub/Drive chỉ lưu URL/title/description/creator; không tự tải toàn bộ nội dung hoặc cấp quyền vào dịch vụ ngoài.

`workspace_resources` đề xuất: `_id, workspaceId, projectId?, type(link/file), title, description?, url?(http/https), fileId?, tags, createdBy, version, deletedAt, createdAt, updatedAt`. XOR: Link có url và không fileId, File có fileId và không url. Resource file dùng cùng files/storage/quota, không upload bản thứ hai. Project tag không tạo Project Membership.

Không fetch link để tự lấy thumbnail/preview ở bản đầu; tránh yêu cầu backend truy cập URL bất kỳ. Link ngoài mở chủ động, không bảo đảm tài nguyên ngoài vẫn tồn tại hoặc mọi Member được Google Drive/Figma cho xem. Rights/quota/phase này chưa duyệt. Không tạo resource record và attachment record dùng chung object trước có quy tắc lifecycle.

## 6. Thông báo chung có ghim

Chủ dự án chốt đây là thông báo Workspace do Owner đăng/ghim, không phải pin cá nhân trên Notifications. Thêm `workspace_announcements`: `_id, workspaceId, title, content(RichText), createdBy, updatedBy, pinnedAt?, pinnedBy?, version, deletedAt, createdAt, updatedAt`.

Members xem; chỉ Owner hiện tại đăng/sửa/xóa/ghim/bỏ ghim, kể cả bài do Owner cũ đăng. Chuyển Owner không xóa bài/ghim. Pin nổi ở Workspace overview, thứ tự pinnedAt mới trước; danh sách bài mới trước theo createdAt. Đề xuất tối đa 3 bài ghim, title 200/content 20.000 ký tự, nhưng quota pin/content chưa duyệt. Pin/unpin dùng Workspace gate + version, tránh hai requests vượt pin count.

Announcement là nội dung chung tồn tại độc lập, Notifications là hộp sự kiện cá nhân. Chưa tự thêm event gửi email/broadcast cho tất cả User từ việc có bài ghim; cần chọn notifications/email setting mapping nếu muốn. Link/file resource, Task notification và Announcement là các đối tượng khác nhau trong UI/API.

## 7. Scope và bước review

Quyết định mới 03/10/2026: chủ dự án yêu cầu storage là Upcoming sau phần lõi. Dừng lựa chọn provider/quota/upload rights và triển khai files/resources/storage_usage hiện tại; giữ nội dung khảo sát phía trên làm tài liệu tham khảo cho increment. Google sign-in/avatar vẫn bản đầu; announcement Owner capability vẫn ghi nhận, phase/quota còn mở. Các câu hỏi upload/resources/quota/Assignee upload đã gửi không còn là đầu vào cần trả lời để phát triển lõi. Không coi số dung lượng hoặc R2 là được duyệt. Mô tả Workspace đủ dài vẫn là yêu cầu riêng.

- Đã chốt: Google sign-in ngay bản đầu, dùng avatar Google nếu có/fallback; Owner announcement/pin capability.
- Cần chốt: upload/resources ngay bản đầu hay increment Documents; provider/budget/quota/types, quyền Assignee upload, copy-link/download policy, description limits và số bài ghim.
- DB core phải điều chỉnh User credential optional và thêm auth_identities/announcements. files/resources/storage_usage chỉ là mở rộng đề xuất cho tới khi scope được duyệt.
- Cần thiết kế OAuth callback/linking, Terms completion, Google-only account lifecycle và storage jobs/API/security tests trước code. Không có cloud deployment/storage account hoặc kiểm thử upload từ tài liệu này.

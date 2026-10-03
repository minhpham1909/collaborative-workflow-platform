# Cụm 07 — Landing, Policies và thông báo chung Workspace

03/10/2026. Hoàn thành vòng phân tích bảy cụm, trước wireframe. Nguồn [SRS](../../srs/SRS-v0.2.md), [screen spec](../SCREEN-SPEC-v0.2.md), [gap log](../UI-API-GAPS-v0.1.md). Layout là đề xuất, không tự hoàn thiện nội dung chính sách hoặc duyệt phase/quota announcements.

## 1. Landing và Home khác nhau

Landing `/` giới thiệu sản phẩm trước đăng nhập; Home `/app` chứa Workspace của user. Landing không truy vấn dữ liệu nhóm riêng tư để làm ví dụ. Đã có phiên thì CTA Vào ứng dụng, không bắt login lại hoặc tự mở Workspace đầu tiên.

Header: logo/tên sản phẩm, Việt/English, Đăng nhập và Đăng ký. Hero ngắn: “Quản lý công việc nhóm trong một nơi”, mô tả Workspace → Project → Task, CTA chính Tạo tài khoản và phụ Đăng nhập. Minh họa Board bằng dữ liệu mẫu ghi rõ. Bên dưới ba khối lợi ích: tổ chức nhóm/dự án, phân công/theo dõi Task, trao đổi trong công việc; kết thúc có CTA và footer Terms/Privacy/liên hệ.

Không pricing, số khách hàng/testimonial giả, upload, AI hoặc realtime promise chưa có. Mobile một cột, CTA dễ thấy, preview Board có bản thu gọn thay vì hình desktop chữ nhỏ. Page vẫn đọc được nếu illustration không tải. Heading và copy Việt/English, không dùng full-screen animation trì hoãn việc vào ứng dụng.

## 2. Terms / Privacy

Hai trang dùng chung template: title, version, ngày hiệu lực, nội dung theo heading, mục lục desktop/mobile thu gọn, liên hệ và Back. Public đọc được không cần login; khi mở từ Register/Google consent, có đường về form và không tự tick acceptance. Preserve draft trong tab theo flow, không đưa password vào URL hoặc web storage.

Wireframe chỉ dùng outline có nhãn Draft, không dùng văn bản mẫu để coi policy đã phát hành. Nội dung thật cần phản ánh dữ liệu account, Google identity/avatar, Workspace/Task/Comments, email/worker và dịch vụ sẽ dùng; retention/purge/contact/provider production còn cần chốt. Không tự cam kết quota, xóa dữ liệu, thời hạn giữ hoặc cloud storage chưa triển khai.

Terms acceptance version phải khớp capabilities/backend và nội dung người dùng đã đọc, không thay version env để vượt gate. Privacy có page version riêng khi hoàn thiện, không tự yêu cầu checkbox riêng ngoài contract Terms hiện hành. Trước public release phải có cả Việt/English được review; UI prototype chưa phải nghiệm thu pháp lý. Bước này thiết kế cấu trúc đọc, không đưa lời khuyên pháp lý hay bản policy hoàn chỉnh.

## 3. Thông báo chung Workspace — phase riêng

Capability đã chốt: Member đọc, chỉ Owner tạo/sửa/xóa/ghim/bỏ ghim; quyền Owner mới áp dụng cho bài do Owner cũ đăng. Đây là announcement của cả nhóm, không phải ghim notification cá nhân. BE chưa triển khai; không đặt nav/nút hoạt động giả trong increment lõi.

### Màn hình đề xuất cho phase này

- Workspace Projects có vùng bài ghim thu gọn bên dưới mô tả; preview title/trích nội dung/ngày và link đọc bài. Tránh phần ghim dài đẩy Projects quá xa, nhất là mobile.
- Danh sách thông báo chung: title/trích nội dung, pinned badge, thời gian, search title/content và ngày tạo; mới tạo trước. Sorting của vùng pinned cần policy riêng, chưa tự chọn thứ tự ghim thay rule danh sách.
- Chi tiết: title, nội dung editor viewer, người đăng/thời gian, Owner actions. Identity tác giả đã rời nhóm cần scoped DTO giống vấn đề Task; không lộ email.
- Form Owner: title/content chung editor, Save/Cancel; pin/unpin và delete actions tách, conflict giữ draft; BE kiểm current Owner/membership mỗi request.

Mất membership thì bỏ nội dung; Owner chuyển quyền thì đóng form quản lý và cập nhật actions. Không coi quyền author là quyền quản lý announcement sau khi hết Owner. Không thêm Comment/react/read receipt/broadcast email cho bài nếu chưa chốt nghiệp vụ.

### Quyết định còn mở của phase

Số bài ghim tối đa, số ký tự title/content, ordering nhiều bài ghim, pagination/search/cursor/version contract, event fanout và phase phát hành. Đề xuất giữ phạm vi đọc/Owner quản lý trước, không tự gửi email từ pin. Storage/resources vẫn Upcoming, không attach file vào announcement trong scope lõi.

## 4. Frames và điều kiện nối FE

Landing desktop/mobile, guest/session CTA; Policies outline/long headings/version/back từ consent; announcement list/detail/pinned/Owner forms/conflict/mất quyền ở batch phase riêng. Landing cơ bản không cần BE mới; policy content/version là blocker public release. Announcement screens chỉ nối sau có schema/DTO/API/QA; không nghiệm thu bằng mock.

Kết thúc phân tích bảy cụm không đồng nghĩa mọi layout, policy và announcements đã duyệt. Bước tiếp theo là [tổng hợp trước wireframe](../SCREEN-REVIEW-SUMMARY.md), dựng wireframe lõi bằng dữ liệu mẫu rồi review hình thức/bố cục trước chọn libraries và production FE.

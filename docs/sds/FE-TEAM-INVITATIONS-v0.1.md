# Thành viên / Lời mời Workspace FE v0.1

04/10/2026. Increment sau [Account](FE-ACCOUNT-SETTINGS-v0.1.md); [QA](../qa/FE-TEAM-INVITATIONS-CHECK.md), [nghiệp vụ](../ui-ux/clusters/CLUSTER-03-MEMBERS-INVITATIONS-WORKSPACE-SETTINGS.md).

## Danh sách và quyền

Workspace có tab Thành viên cho mọi membership active; tab Lời mời chỉ Owner. Role lấy lại qua GET Workspace trước mỗi lần tải danh sách. Server vẫn là nguồn quyền: mất membership/Owner thì dữ liệu danh sách bị xóa sau lỗi; không giữ recipient email trong view sau reload role thành Member. Chuyển quyền thành công tải lại context và ẩn nút quản lý.

Member cards có avatar, tên, vai trò, ngày gia nhập, không email. Owner được loại thành viên khác và chuyển quyền; Member có rời nhóm. Dialog xác nhận giải thích mất truy cập, cleanup assignee/overrides và ảnh hưởng ownership. Remove/leave dùng membership version, transfer dùng Workspace version; lỗi chặn submit tiếp trên snapshot cũ. Đóng dialog làm mới; không tự lấy version mới rồi gửi lại mutation.

BE bổ sung query cho GET members/invitations: `q` tối đa 200 ký tự/20 từ, `from`/`to` ngày Việt Nam inclusive; members tìm tên/gia nhập, invitations tìm email/ngày tạo + `type=all|EMAIL|LINK`, `state=all|active|expired|accepted|revoked`. Search không phân biệt dấu. Authorization → server filter → sort mới nhất → cursor/limit, không search trang FE đã tải. Member query join identity bằng projection tối thiểu trong scope Workspace. State invitation dùng cùng thời điểm snapshot với DTO, revoked ưu tiên accepted rồi expired. Không thêm total giả; picker Task có thể dùng endpoint search này ở increment sau. NFR/index optimization vẫn cần đo với dữ liệu lớn.

## Lời mời và nhận lời mời

Owner tạo EMAIL hoặc LINK có hạn 7 ngày. EMAIL chỉ hiển thị kết quả queue; sent chỉ provider accepted, không xác nhận Inbox/đã đọc. Retry chỉ hiện nếu delivery failed và invitation active; giữ hạn cũ. Thu hồi không loại người đã vào nhóm hoặc rút email đã gửi.

LINK URL chỉ giữ trong dialog kết quả một lần; copy có fallback chọn thủ công, không localStorage/telemetry. Đóng kết quả không thể lấy lại URL từ danh sách. Dialog có focus trap, Escape, inert shell và cuộn ở màn hình nhỏ. Mutation không auto retry; network ambiguity yêu cầu kiểm lại trạng thái. Không tự chạy SMTP worker.

URL `/invite#token=…` được đọc vào memory, bỏ token khỏi address bar và chuyển `/#invite`. Login giữ intent trong lượt mở trang; sau login preview tối thiểu và verified accept. Token không có sau reload thì hướng mở lại link gốc. Accept thành công mở Workspace; lỗi email mismatch/unavailable có thông báo ổn định. EMAIL từ Notifications vẫn nhận theo ID như increment trước.

Scope tiếp theo: cài đặt tên/mô tả nhóm với shared editor, own Workspace email overrides, signup/recovery và English UI. Routing giữ tab/filter khi back và mọi draft transition chưa hoàn thiện; không thêm storage/announcements/role mới.

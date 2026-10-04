# FE Workspace/Project v0.1

04/10/2026. Increment sau [Login/Home](FE-FOUNDATION-v0.1.md), theo cụm Navigation/Home/Workspace và phần đọc Members. Đây là FE nối API thật; không mở tab/CTA giả cho chức năng chưa nối.

## Navigation và màn

Home card → `#workspace/:id` → `#project/:id`; hash parser chỉ nhận ObjectId hợp lệ, route khác về Home. Browser reload/back/forward hoạt động; xác thực trước đọc dữ liệu, giữ route khi login. List filters hiện thuộc state từng màn, chưa giữ sau unmount/back.

Workspace tải GET context trước list. Header tên/role, mô tả thu gọn; tab Dự án và Thành viên. Project list có state active/archived/all, search tên/mô tả, khoảng ngày tạo Việt Nam và cursor. Mặc định active, sort mới tạo trước. Member list chỉ đọc thành viên active, tên/vai trò/ngày tham gia và load more, không hiển thị email. Member search/time, invites/ownership/settings chưa nối.

Owner tạo Project bằng tên qua NameDialog chung; chưa form editor mô tả. Chi tiết Project đọc context Workspace để phân quyền, Owner đổi tên Active và archive/reopen. Archived ẩn đổi tên, có banner chỉ đọc. Không có Project delete. Đây là màn tổng quan tạm trước nối Board vào route Project theo screen flow cuối cùng; chưa hoàn thành giao diện Project làm việc.

Mutation gửi expectedVersion; conflict giữ draft, người dùng đóng form và Làm mới Dự án trước sửa tiếp. Không gộp dữ liệu hoặc auto retry mutation timeout. Role UI là hỗ trợ, BE recheck mỗi request. Lỗi mất quyền khi đọc/đổi state xóa context/data khỏi màn; không truy cập đối tượng chỉ từ ID route. Refresh không realtime.

Description hiển thị derived plainText dưới React escaping, không dangerouslySetInnerHTML. Tiptap/editor/i18n/identity lịch sử vẫn increment sau. NameDialog có inert/focus trap/escape/cancel draft confirmation và chặn submit song song.

## BE query bổ sung

GET /workspaces/:id/projects thêm q/from/to cùng semantics Workspace list; state giữ active mặc định. Query strict, search literal không dấu trên tên hoặc description.plainText. Scope membership + Workspace, state và filters trước cursor/total; count không phụ thuộc cursor. Không mở rộng query các danh sách khác hoặc thay quyền Owner.

[QA](../qa/FE-WORKSPACE-PROJECT-CHECK.md), [gaps](../ui-ux/UI-API-GAPS-v0.1.md).

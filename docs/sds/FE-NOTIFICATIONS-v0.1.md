# FE Notifications v0.1

04/10/2026. Inbox `#notifications`, chi tiết `#notification/:id`, badge trong navigation dùng BE thật. [QA](../qa/FE-NOTIFICATIONS-CHECK.md).

Inbox mới tạo trước, read/category/search/date filters, cursor/load more, debounce 300 ms và generation bỏ response cũ. Total theo mọi filter; unreadCount theo category/search/date, không theo read/cursor. Badge query all/limit=1, tải khi vào shell/focus và sau read/accept/refresh, không realtime; lỗi giữ số cũ có nhãn cần tải lại, không giả 0.

Detail GET không tự mark read; nút đánh dấu và link mở Task tách riêng. Unavailable giữ generic row/read action nhưng không payload/target/link cũ. EMAIL invitation chỉ accept by ID từ detail, không raw token; unverified xem preview nhưng không có accept control. Inbox được mở trước verified gate trong shell, các màn công việc vẫn gated. Accept thành công refresh và dẫn người dùng về Home chọn Workspace.

Mutation chặn double submit, không auto retry lỗi mạng. Read-all dùng cutoff của list đúng query đã tải; đang đổi filter/loading thì disabled. HMAC v2 bind recipient/category/q/from/to và biên createdAt/_id, không đọc thông báo mới hơn biên. Read-all áp dụng category/search/date độc lập read filter; kiểm lại payload masking ở lúc ghi khi có search. Cutoff cũ v1 bị từ chối, cần tải lại list sau cập nhật.

## BE query extension và privacy

GET /notifications thêm q/from/to (ngày tạo Việt Nam); literal AND không dấu, regex escaped, giới hạn 200 ký tự/20 từ như lists khác. Search chỉ strings trong payload đã qua current-rights mapper. Unavailable chỉ tìm bằng message chung, không title/Workspace/actor cũ; total/unread/cursor/cutoff cùng tập đã masked. Ngày/category coarse filter ở Mongo trước mapping.

Không search: Mongo count/cursor/limit trực tiếp như trước. Có search: scan tuần tự tập recipient/category/date, recheck target rồi match, giữ tối đa limit+1 kết quả trong memory và count toàn tập. Đây là lựa chọn correctness cho increment, **chưa nghiệm thu hiệu năng tập lớn**; cần scoped aggregation/index/NFR trước release. Read-all search cũng scan lại unread phù hợp biên trong transaction. Không tin snapshot quyền hoặc tìm trên payload thô để đếm.

Tiếp theo Account/Personal Settings, quản lý Members/Invitations, English, routing/draft polish và vận hành. Không chạy SMTP thật, worker nền hoặc thay Figma trong increment này.

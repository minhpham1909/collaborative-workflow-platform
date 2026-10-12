# M3 — collection views

12/10/2026. M3a Notifications đạt. Chi tiết/Thu gọn thay density, giữ thông tin/action/read state; single notification luôn full detail. Browser-local preference riêng account+collection, invalid/blocked storage fallback và đổi mode vẫn dùng được.

Return từ Task/detail: lưu chỉ query, anchor ID, geometry và số trang trong bộ nhớ (max20entries/max20pages; clear khi account change). Return list re-fetch theo quyền hiện tại, không dùng cached notification bodies; khôi phục anchor offset hoặc scroll clamped nếu item không còn. Filter change hủy kết quả cũ. Với hơn240 item đã tải, auto restore giới hạn20pages; tiếp load-more thủ công. Không hứa mọi tình huống Back/cross-tab/reload đều khôi phục exact vị trí; hard reload không giữ module-memory anchor.

M3a QA: light/dark fixtures PASS, 2 modes×5width English, Việt switching/return, no view-change read/write/query/cursor mutation, reload preference, blocked storage usable, Task/detail fresh2page return (<3px offset), detail full. NotificationsS9a Vi/En/5width regression PASS gồm signed filtered read-all, unknown write readback, search races, masking leave/rejoin. FE25/25 PASS (view preference scope + bounded return), build/budgetPASS. Fixtures DB/API riêng; không gửi provider/email/devwrites. Screenshot `.local/inbox-views/` ignored.

M3b tiếp: cùng control trên collections phù hợp; Team/Audit giữ bảng; bounded lazy-load có manual fallback, không tự chạy worker hay tạo data.

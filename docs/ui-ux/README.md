# Chuẩn bị UI/UX

Có [kế hoạch UI/UX v0.1](UI-UX-PLAN-v0.1.md) để chuyển từ mock Task sang kiến trúc thông tin, wireframes và prototype toàn ứng dụng theo dependencies SRS.

Nguồn screen inventory: SRS v0.2 mục 7.2. Chưa có wireframe hoàn chỉnh.

Đã có [luồng màn hình v0.1](SCREEN-FLOWS-v0.1.md), mapping đủ 33 UC và các trạng thái chính. Đây là dự thảo phân tích; các lựa chọn chưa được duyệt vẫn được đánh dấu rõ.

Đã phân tích sâu [Kanban và My Tasks](KANBAN-MY-TASKS-DESIGN-v0.1.md), gồm mục đích, quyền, bố cục, sắp xếp, tải thêm, filters và các tình huống dễ hiểu nhầm. Chờ chủ dự án chốt OD-04/05; chưa có UI hoặc wireframe hoàn chỉnh.

Theo yêu cầu mới, có [đặc tả search động/bộ lọc thời gian dùng chung](TASK-SEARCH-TIME-FILTERS.md) cho Kanban/My Tasks; không đổi sort mới tạo trước. OD-04 đã chốt status/thứ tự, OD-05 mới chốt sort/bố cục và yêu cầu search/time; defaults còn review riêng.

Luồng cần vẽ sau khi duyệt yêu cầu: đăng ký/xác minh và tiếp tục invitation; Welcome/Personal Home; Workspace và quản lý thành viên; Project Active/Archived; Task/Board/My Tasks; Comments/Notifications; Personal Settings/Profile/Account; Landing/Terms/Privacy.

Mỗi luồng cần trạng thái loading, empty, lỗi form, mất quyền, dữ liệu đã xóa, conflict và thao tác bằng bàn phím. Việc lập danh mục chưa chứng minh UI đáp ứng NFR.

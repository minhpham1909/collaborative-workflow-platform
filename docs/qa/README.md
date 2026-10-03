# Trạng thái kiểm tra

Cập nhật: [Auth/session check](AUTH-SESSION-CHECK.md): 28 tests đạt, 1 Mongo integration test skipped; chưa có live DB, Google/signup/verification/reset hoặc FE nghiệm thu.

Cập nhật 03/10/2026: [backend foundation check](BACKEND-FOUNDATION-CHECK.md) ghi 16 tests schema/editor/HTTP đạt và dependency audit không báo vulnerability. Chưa kiểm thử database/index/transaction/auth nghiệp vụ hoặc FE thực tế.

Đã có công cụ kiểm tra tài liệu `scripts/check-srs.ps1`. Nó kiểm tra tham chiếu và đồng bộ UC; không xác nhận tính đúng đắn nghiệp vụ.

Đã kiểm tra [bản mẫu My Tasks](MY-TASKS-MOCKUP-CHECK.md): sort/filter và trạng thái local trên dữ liệu minh họa, giao diện desktop/360 px. Đây là kiểm tra bản mẫu, không phải kiểm thử ứng dụng thật.

Chưa có code để chạy AC-01 đến AC-33, AC-X01 đến AC-X20, kiểm thử concurrency/auth hoặc đo NFR. Các kiểm tra nghiệp vụ phải thực hiện sau khi yêu cầu liên quan được duyệt và có lát cắt chạy thật.

Ưu tiên kế hoạch sau baseline: quyền xuyên Workspace; vòng đời membership và tái gia nhập; accept/revoke và transfer/leave đồng thời; archive/write và stale edits; recipients/email preferences; token/session lifecycle; sau cùng nghiệm thu NFR trong môi trường ghi nhận cụ thể.

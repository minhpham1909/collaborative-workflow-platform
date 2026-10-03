# Tài liệu dự án

Đọc [trạng thái hiện hành và bước tiếp theo](project/NEXT-STEPS.md) trước khi tiếp tục phát triển. Yêu cầu mới trực tiếp của chủ dự án có ưu tiên cao hơn các ghi chú hoặc đề xuất trong tài liệu.

| Nhóm | Nội dung |
|---|---|
| [project](project/NEXT-STEPS.md) | Trạng thái, kế hoạch và [quy tắc file Git](project/REPOSITORY-HYGIENE.md) |
| [srs](srs/SRS-v0.2.md) | Yêu cầu, Use Cases, nghiệp vụ, review và traceability |
| [sds](sds/README.md) | Thiết kế kỹ thuật hiện hành: DB, stack, bảo mật, backend |
| [ui-ux](ui-ux/README.md) | Luồng màn hình, editor, ngôn ngữ và wireframe scope |
| [decisions](decisions/DECISION-REGISTER.md) | Quyết định được duyệt/đề xuất và [Git workflow](decisions/GIT-WORKFLOW.md) |
| [qa](qa/README.md) | Bằng chứng kiểm tra và giới hạn kiểm chứng |
| [archive](archive/README.md) | Tài liệu lịch sử đã được thay thế; không dùng làm trạng thái hiện tại |

Root chỉ giữ README tổng quan; README nằm trong BE/FE và các thư mục phụ giới thiệu phạm vi tại chỗ. Tài liệu yêu cầu/thiết kế, quyết định và QA được commit cùng code. Không ignore toàn bộ `.md` hoặc lockfile.

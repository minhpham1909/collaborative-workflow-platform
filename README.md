# Collaborative Workflow Platform

Dự án portfolio cộng tác nhóm nhỏ: User → Workspace → Project → Task.

Trạng thái 03/10/2026: BE JavaScript/Express/Mongoose có 13 models, health/editor validation, JWT sessions và account flows (signup, verify/reset/change password, Google login/link, encrypted email outbox). 33 tests thông thường và 14 integration tests đạt trên MongoDB replica set local. Google login thật đã có kết quả /auth/me 200 do chủ dự án kiểm; SMTP accepted email thử, Inbox còn xác nhận. Profile/global settings BE đã triển khai; frontend và Workspace/Invitations tiếp theo. Repo GitHub private minhpham1909/collaborative-workflow-platform, phát triển trên dev; SRS chưa baseline v1.0. Xem [Accounts/QA](docs/qa/AUTH-ACCOUNTS-CHECK.md).

## Tài liệu chính

[Danh mục tài liệu](docs/README.md) phân chia trạng thái dự án, yêu cầu, thiết kế, quyết định, QA và archive. [Quy tắc file Git](docs/project/REPOSITORY-HYGIENE.md) mô tả những gì nên/không nên commit.

Thiết kế DB hiện hành: [DB v0.2](docs/sds/DATABASE-DESIGN-v0.2.md), [layout dữ liệu](docs/sds/DATABASE-LAYOUT-v0.2.json), [ERD lõi](docs/sds/DATABASE-ERD-v0.2.md). Có 13 Mongoose models; indexes/Auth transactions đã kiểm trên MongoDB local. Các nghiệp vụ công việc chưa có API. Storage là Upcoming, announcement/idempotency giữ riêng theo phase/policy còn mở.

Mở rộng scope 03/10/2026: SRS hiện 35 UC/29 FR sau Google sign-in/avatar và Workspace announcements/pin. [Nghiên cứu avatar/storage/resources](docs/sds/AVATAR-STORAGE-RESOURCES-REVIEW.md) giữ rõ provider/quota/phase còn đề xuất. Các ghi nhận 33 UC bên dưới là số trước mở rộng.

Cập nhật 03/10/2026: nhóm nghiệp vụ 1–3 đã duyệt, nhóm 4–5 tạm chốt; Việt/English và editor chung đã bổ sung. BE dùng JS/Express/Mongoose; FE React JS/JSX, thư viện UI chọn trong quá trình thiết kế/code. Database/email providers, NFR/retention và giới hạn sản phẩm vẫn cần review. Trạng thái ưu tiên tại [docs/project/NEXT-STEPS.md](docs/project/NEXT-STEPS.md).

- [SRS v0.2](docs/srs/SRS-v0.2.md) và [35 Use Cases](docs/srs/use-cases.json): nguồn yêu cầu dự thảo.
- [Báo cáo review](docs/srs/SRS-REVIEW-v0.2.md): vấn đề cần giải quyết trước baseline.
- [Decision register](docs/decisions/DECISION-REGISTER.md): phân biệt quyết định đã ghi nhận, đang mở và đề xuất bổ sung.
- [Traceability](docs/srs/TRACEABILITY.md): ánh xạ hai chiều FR ↔ UC và tham chiếu BR/AC.
- [Chuẩn bị SDS](docs/sds/README.md), [UI/UX](docs/ui-ux/README.md), [QA](docs/qa/README.md).
- [NEXT-STEPS.md](docs/project/NEXT-STEPS.md): trạng thái hiện tại và bước tiếp theo.
- [Backend foundation](docs/sds/BACKEND-FOUNDATION-v0.1.md), [hướng dẫn chạy BE](BE/README.md), [bằng chứng kiểm tra](docs/qa/BACKEND-FOUNDATION-CHECK.md).

[HANDOFF-PROMPT gốc](docs/archive/project/HANDOFF-PROMPT.md) được giữ trong archive để đối chiếu lịch sử; trạng thái/quyết định mới xem docs/project/NEXT-STEPS.md và decision register.

## Cấu trúc

| Thư mục | Vai trò |
|---|---|
| `docs/project`, `docs/archive` | Trạng thái hiện hành/quy tắc repo và tài liệu lịch sử |
| `docs/srs` | Yêu cầu, Use Cases, review, traceability |
| `docs/sds` | Thiết kế kỹ thuật sau khi duyệt yêu cầu |
| `docs/decisions` | Quyết định và ADR |
| `docs/ui-ux` | Luồng màn hình và wireframes |
| `docs/qa` | Kế hoạch kiểm tra và bằng chứng |
| `assets/brand`, `assets/references` | Tài nguyên và nguồn tham khảo |
| `FE`, `BE` | Skeleton frontend và backend đã bootstrap |
| `packages/contracts` | Vị trí dự kiến nếu duyệt hợp đồng dùng chung |
| `scripts` | Công cụ kiểm tra tài liệu local |
| `infra` | Cấu hình môi trường sau khi chọn cách triển khai |

## Kiểm tra tài liệu

Chạy từ root dự án trong PowerShell:

```powershell
./scripts/check-srs.ps1
./scripts/check-srs.ps1 -WriteTraceability
./scripts/check-doc-links.ps1
```

Lệnh đầu kiểm tra cấu trúc JSON, 35 UC liên tục, ID trùng, FR/BR/AC/OD bị thiếu, tham chiếu FR ↔ UC và nội dung UC giữa JSON/Markdown. Lệnh thứ hai tạo lại traceability sau khi kiểm tra thành công. Đây là kiểm tra tài liệu, không phải kiểm thử nghiệp vụ hay chứng nhận SRS đã được duyệt.

Không cần cài dependencies cho công cụ tài liệu. Chạy backend/tests từ BE theo README riêng, dùng Node 24.x và pnpm 11.19.0. Chưa tạo root workspace hoặc frontend package.

## Quy trình tiếp tục

Theo requirement, hoàn thiện BE/contracts theo module trước, rồi thiết kế FE tổng thể hoặc từng module trên nền navigation/design system chung. Google/SMTP thật kiểm qua [hướng dẫn local](docs/project/GOOGLE-SMTP-LOCAL-SETUP.md); ưu tiên Workspace/Invitations → Project/Task/Comment → Notifications/Settings. Không ghi nghiệm thu từ schema tests.

File dự án lưu trực tiếp tại thư mục local này. Cấu hình chạy backend ở BE/.env.example; file .env thật không theo dõi trong Git. Tài nguyên tham khảo phải ghi nguồn; không lưu secret trong Git.

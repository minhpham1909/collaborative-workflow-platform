# Hướng tech stack — JavaScript

Ngày 03/10/2026. Nguồn: chủ dự án cho biết quen JS + Express + Mongoose và React JS/JSX hơn TS/NestJS. Điều chỉnh hướng thiết kế theo nền tảng quen thuộc; chưa cài dependencies hoặc chốt toàn bộ thư viện/phiên bản/provider.

## Nền tảng thiết kế

| Phần | Hướng sử dụng |
|---|---|
| BE | Node.js, JavaScript, Express, MongoDB và Mongoose |
| FE | React, JavaScript/JSX; Vite tiếp tục là công cụ build đề xuất |
| Kiến trúc | Một API chia module nghiệp vụ; frontend tổ chức theo feature |
| Giao tiếp | REST; API contracts/errors/versioning/pagination thiết kế ở SDS |

Không tiếp tục lấy NestJS/TypeScript làm mặc định. Schema Mongoose là schema persistence, không thay thế validation input hoặc kiểm tra quyền tại lúc đọc/ghi. Contracts dùng chung nếu có là schema/constants/code JavaScript hoặc OpenAPI, không phụ thuộc TypeScript types.

## Tổ chức backend đề xuất

BE/src gồm app.js (cấu hình Express), server.js (khởi chạy), config, middleware, modules, shared và jobs. Mỗi module auth/users/workspaces/invitations/projects/tasks/comments/notifications có route/controller/service/model/validation theo nhu cầu. Controller xử lý HTTP; service xử lý nghiệp vụ; middleware quản lý auth/error/validation chung. Tránh tạo đủ các lớp rỗng hoặc generic repository khi chưa có nhu cầu.

Phân quyền cần đánh giá membership, role, creator/assignee/author và trạng thái Project ở thời điểm thao tác; không chỉ kiểm tra role trong route. Conflict, idempotency, transactions và email outbox cần thiết kế cụ thể, không suy rằng Express/Mongoose tự bảo đảm chúng.

## Tổ chức frontend đề xuất

FE/src gồm app (router/providers), features, components (UI/editor chung), hooks, lib (API/client helpers), locales/vi và locales/en. Component React dùng .jsx; helper/config dùng .js. Các feature bám Auth/Workspace/Project/Task/Comment/Notification/Settings.

React Router, TanStack Query, Tailwind/shadcn, React Hook Form/Zod, Tiptap và react-i18next vẫn là ứng viên để review. Bootstrap cần chọn cấu hình JavaScript tương ứng và kiểm tra phiên bản tương thích; không đưa file .ts/.tsx vào dự án theo scaffold mặc định. Client validation giúp UX; server validation vẫn là nguồn kiểm tra bắt buộc.

## Chất lượng và bước kế tiếp

Security-DESIGN xem SECURITY-DESIGN-v0.1.md: FE validation hỗ trợ UX; BE tự kiểm tra toàn bộ request và quyền đối tượng. Session/JWT là lựa chọn thiết kế riêng, không được bỏ revocation vì dùng JWT. Chưa cài auth library hoặc tạo API chạy được.

Dùng ESLint, format thống nhất, JSDoc ở hợp đồng/hàm quan trọng, runtime validation và kiểm thử hành vi auth/quyền/conflict. JSDoc không biến toàn bộ dự án thành TypeScript và không yêu cầu chuyển ngôn ngữ sau này.

Tiếp theo: thiết kế mô hình dữ liệu và API, wireframes song song; review thư viện/core tooling; bootstrap JS BE/JSX FE sau khi các lựa chọn triển khai được cụ thể hóa. Chưa có ứng dụng chạy được hoặc package manager/runtime version được chọn từ tài liệu này.

# Repository và nhánh phát triển

Ngày 03/10/2026. Theo yêu cầu chủ dự án: đặt tên thư mục gốc `BE/` và `FE/`, đưa toàn bộ source/tài liệu dự án vào repo GitHub mới, commit khởi đầu rồi tạo nhánh `dev` để tiếp tục phát triển.

Repository: `minhpham1909/collaborative-workflow-platform`, private theo mặc định của lần khởi tạo. Không có dữ liệu runtime, dependencies, file .env thật hoặc credential trong commit.

| Nhánh | Vai trò |
|---|---|
| `main` | Mốc khởi đầu và các phiên bản đã hợp nhất |
| `dev` | Nhánh tiếp tục phát triển hiện tại |
| `codex/<tên-công-việc>` | Nhánh riêng khi cần tách một thay đổi để review |

`BE/` chứa package Node/Express/Mongoose đã bootstrap; `FE/` hiện là skeleton React JS/JSX, chưa có frontend chạy được. `docs/`, `scripts/`, `packages/`, `assets/` và `infra/` giữ ở root. Dependency lockfile nằm tại `BE/pnpm-lock.yaml`; chạy backend/tests từ `BE/`.

Nhánh `dev` bắt đầu từ commit khởi đầu trên `main`. Chưa cài branch protection, CI hoặc deploy. Các thay đổi tiếp theo ưu tiên Auth/User theo NEXT-STEPS.md.

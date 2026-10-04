# FE foundation v0.1

04/10/2026. Implementation đầu của FE sản phẩm, khác với prototype dữ liệu giả trong `docs/ui-ux/stitch-review`. Bám JS/JSX theo lựa chọn của chủ dự án; hướng visual kem/tím của Stitch. Chưa tuyên bố khớp pixel toàn bộ Figma hoặc hoàn thành bốn màn.

## Tooling và cấu trúc

React/React DOM 19.3.0, Vite 8.3.2, plugin React 6.1.1; pin trong package và pnpm lockfile. Node 24.x, pnpm 11.19.0. [React hướng dẫn build từ nền tảng](https://react.dev/learn/build-a-react-app-from-scratch), [Vite guide](https://vite.dev/guide/) đã đối chiếu ngày 04/10/2026.

`src/app` quản lý phiên/shell; `features/auth` và `features/workspaces` chứa Login/Home; `lib` là API client/error mapping; CSS và font local tạo nền visual chung. State dùng React hooks. Router, server-state library, forms, editor và i18n chưa chọn ở increment này; không scaffold lớp rỗng cho các module chưa triển khai.

## Phiên và HTTP

Access JWT và CSRF challenge chỉ ở memory; không lưu token trong local/session storage. Fetch dùng credentials include. Restore lấy CSRF mới rồi refresh; cùng tab chia một promise, Web Locks tuần tự refresh/logout giữa các tab cùng origin. Epoch ngăn refresh cũ phục hồi phiên đã bị clear/thay đổi. BroadcastChannel chỉ gửi sự kiện session-changed sau login/Google/logout; tab khác bỏ memory cũ và kiểm lại phiên, không gửi token hoặc thông tin cá nhân qua channel.

GET được refresh/retry tối đa một lần khi 401. Mutation không tự retry sau lỗi: timeout có thể đã commit. Logout lỗi mạng giữ thông tin phiên và báo chưa xác nhận thu hồi. Web Locks/BroadcastChannel có fallback; trước hỗ trợ browser không có Web Locks phải kiểm riêng refresh concurrency. Đây chưa là nghiệm thu mọi biến thể auth/multi-tab hoặc production security.

Login validate email/password hỗ trợ UX; không trim password. BE tiếp tục validate và kiểm credential/quyền. Google lấy client ID/challenge từ BE, dùng GIS khi người dùng yêu cầu. ACCOUNT_LINK_REQUIRED không tự link; TERMS_REQUIRED không tự nhận consent. Signup/recovery/link và public policies là phần chưa nối UI.

## Home và query

GET /workspaces lọc membership active trước pagination; mỗi search token phải khớp name hoặc description.plainText. Search accent-insensitive, regex escaped, không nhận Mongo operators. `from/to` là ngày tạo Việt Nam, inclusive ngày cuối bằng biên UTC đầu ngày tiếp theo; sort createdAt/_id mới nhất trước. FE debounce 250 ms, loại response cũ bằng generation; cursor load more giữ query hiện tại.

Modal tạo chỉ nhập tên, chặn double submit, khóa nền bằng inert, trap Tab/Escape và trả focus về control trước. Timeout khuyên tải lại danh sách trước tạo lại; không hứa idempotency. Cards không có navigation giả khi màn Workspace/Project chưa có.

## Phần tiếp theo

Workspace/Project routing và API, rồi Board/Task/Comment/My Tasks; historical identities/member picker cần G02/G03. Tiếp tục shared components, editor envelope, English UI và auth còn thiếu theo [gap log](../ui-ux/UI-API-GAPS-v0.1.md). Public release cần policies, topology HTTPS/cookie/CORS/CSP, vận hành worker và đo NFR riêng.

# Nền backend v0.1

Ngày 03/10/2026. Bước triển khai sau DB v0.2. Những lựa chọn triển khai dưới đây do assistant quyết định trong phạm vi công việc; JWT access + refresh là lựa chọn trực tiếp của chủ dự án. Không coi bản này là duyệt toàn bộ SRS hoặc các giới hạn sản phẩm.

## 1. Kết quả và stack

Đã tạo Express app, cấu hình, kết nối Mongoose có kiểm tra replica set/sharded topology, shutdown và hai health endpoints. Có 12 model lõi, named index declarations, private-field projections/JSON transforms và tests chạy không cần database. Runtime chọn Node 24.x, JavaScript ESM; Express 5.2.1 và Mongoose 9.10.4, pnpm 11.19.0 + lockfile. FE vẫn React JS/JSX, chưa chọn/cài editor UI hoặc khởi tạo frontend trong bước này.

Database chưa được provision/kết nối, index chưa được tạo. Không suy ra quyền giữa collection từ schema: owner membership, Workspace/Project/Task scope, assignee eligibility, cleanup, ownership transfer và outbox atomicity phải được thực hiện ở scoped service/repository transaction. Chưa có API nghiệp vụ, JWT/Google endpoints hoặc worker gửi email.

## 2. JWT — quyết định đã ghi nhận

Chủ dự án chọn JWT access token + refresh token ngày 03/10/2026 qua câu trả lời lựa chọn đăng nhập. Session dùng `refreshTokenHash` (SHA-256 digest của refresh credential ngẫu nhiên entropy cao, không dùng để hash password) và `refreshGeneration`; không dùng variant opaque-cookie. Password hướng Argon2id, chưa có hashing implementation.

Hợp đồng cho bước Auth: access chỉ ở memory FE; refresh cookie HttpOnly/Secure khi production, cookie settings và CSRF theo topology deploy. Protected requests verify JWT và kiểm session expiry/revocation/authVersion cùng quyền hiện tại. Không tin role/membership trong token. Google credentials được BE verify; không tự liên kết account chỉ bởi email, không persist raw Google token. Chưa chọn signing library/algorithm, key management, TTL hay concurrent-refresh policy; hoàn thiện trước Auth endpoints.

## 3. Hợp đồng dữ liệu editor

Format kỹ thuật `prosemirror-json`, schemaVersion `1`; đây là tree tương thích kiểu ProseMirror, chưa chốt thư viện editor FE. Envelope lưu `{format, schemaVersion, document, plainText}`. Client có thể gửi envelope nhưng `plainText` luôn được server tái tạo; HTTP DTO sau này chỉ cần nhận format/version/document. Không nhận HTML tùy ý.

Allowlist nodes: doc, paragraph, heading (level 1–3), text, hardBreak, blockquote, bulletList, orderedList (start 1–9999), listItem. Marks: bold, italic, underline, strike, code, link. Link chỉ http/https/mailto, không credentials/whitespace/control characters; mailto không query/hash. Unknown fields, attributes, marks, sai parent/child đều bị từ chối. Viewer tương lai phải render text an toàn, link `rel`/target theo UI; schema không thay escaping khi render.

Plain text giữ nguyên dấu, emoji và nội dung có chủ ý. Các block phân cách newline; một paragraph rỗng cuối là cursor placeholder, bị bỏ khỏi text/counter. URL ẩn của hyperlink không vào search, chỉ nhãn. Ký tự đếm bằng Intl.Segmenter grapheme; từ dùng word segmentation `vi` và `isWordLike`, chỉ tham khảo. Task searchText server-derived từ title + plainText, NFC và lowercase; chưa triển khai search engine/query/pagination hay chính sách tìm kiếm không dấu.

| Giới hạn kỹ thuật tạm thời | Giá trị |
|---|---|
| Workspace description | 20.000 graphemes |
| Project/Task description | 10.000 graphemes |
| Comment | 5.000 graphemes, không blank |
| Raw tree | 256 KiB UTF-8, tối đa 5.000 nodes, depth 20 |
| Link href | 2.048 UTF-16 code units |
| Display name / Workspace, Project name / Task title | 100 / 200 / 300 UTF-16 code units, một dòng |

Các con số là guardrails triển khai đề xuất, có thể điều chỉnh khi review UI/NFR; không ghi thành giới hạn đã được chủ dự án duyệt. Không truncate khi vượt ngưỡng. IME/paste/mobile/a11y cần kiểm tra khi có editor FE; tests server chưa chứng minh UI editor hoạt động.

## 4. Ghi dữ liệu và bảo mật

Model editable có `version` bắt đầu 0, không tạo thêm `__v`; document save có optimistic concurrency. Các query/bulk mutations bị chặn trong nền hiện tại vì có thể bypass document validators/CAS; phải mở qua thiết kế repository và tests khi implement nghiệp vụ. Không dùng model như API CRUD generic. Mongo refs không có foreign-key constraint; schema không kiểm membership/ownership/parent existence.

No autoIndex/autoCreate lúc start; script riêng gọi createIndexes, không dùng syncIndexes để drop. No TTL cho session/tokens/outbox khi retention chưa chốt. Schema strict không thay DTO validation: Mongoose có thể cast String/Number/Boolean, server phải kiểm đầu vào gốc và từ chối server-owned fields tại mỗi route.

Default selection và JSON transforms giấu hashes, internal revisions, canonical email, raw notification/email payload. Lean/aggregation và toObject vẫn cần authorized response mapper; transform không kiểm quyền đối tượng. Health chỉ trả trạng thái, không lộ URI/driver error; mặc định bind loopback. Headers/CORS/rate limits/CSRF/request parser/DTO/error mapping theo từng route cần bổ sung khi mở business endpoints, không coi foundation là production-ready.

## 5. Tiếp theo

Triển khai Auth/User end-to-end: request/response contracts → password hashing, verification/reset token services → JWT signing/session rotation/revocation → Google identity verification/linking → verified gate/authorization → API integration tests với MongoDB replica set. Sau đó Workspace/Invitations, Project/Task/Comment và notifications/settings/outbox. Storage giữ Upcoming; announcements theo phase riêng.

## Nguồn kỹ thuật

- [Mongoose schema/version/concurrency](https://mongoosejs.com/docs/guide.html)
- [Mongoose validation và giới hạn update validators](https://mongoosejs.com/docs/validation.html)
- [Express security guidance](https://expressjs.com/en/advanced/best-practice-security/)

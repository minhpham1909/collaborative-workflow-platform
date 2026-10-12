# M1 — Nền UI, theme và bố cục gọn

12/10/2026. Theo yêu cầu dùng thư viện UI/icon, hỗ trợ sáng–tối, ảnh/slider và giảm khoảng trống. Áp dụng skill ui-ux vào codebase hiện có, giữ nhận diện Stitch/Jakarta/kem–tím. Mỗi patch có commit riêng; không thay quyền hoặc nghiệp vụ Task.

## Mở lại gate visual theo feedback12/10

Người dùng cung cấp lỗi Shared Projects hero/empty, Task metadata và comment empty trong dark; yêu cầu slider là lớp nền trong banner và bố cục tận dụng màn rộng. Các PASS chuyển theme/overflow/metadata/control trước không chứng minh các vùng này đã đúng. M1b/M1c visual acceptance mở lại; chưa sửa product trong lượt review. [Task R1–R5](../ui-ux/M1-VISUAL-REVIEW-R1.md). Giữ phần dưới như lịch sử phạm vi kiểm, không coi là nghiệm thu đầy đủ dark mode.

## Các thay đổi

- Lucide React 1.55.0: thay SVG tự viết qua wrapper Icon, giữ toàn bộ tên gọi hiện có, static imports; SVG trang trí aria-hidden và focusable=false. Icon điều hướng/metadata/theme có màu theo vai trò.
- Tailwind 4.3.3 + plugin Vite: prefix tw, không nhập Preflight; dùng token wf và thí điểm utility ở metadata/summary My Tasks. Không cài Bootstrap hoặc thay bộ component nội bộ.
- My Tasks: padding thẻ 20px → 12px theo chiều dọc, giảm margin tiêu đề/nhóm/summary, bỏ nền/padding header thừa, giữ nội dung và hit target. Tablet dùng cùng hàng body/action, mobile chia hàng để giữ vùng bấm. Metadata chip inline-flex, icon16px không co, ngày giờ không xuống hàng bên trong chip; cả hàng chip vẫn wrap. Giữ mã, context Workspace/Project, deadline, trạng thái, priority, label, checklist và readonly.
- Theme: mặc định System, có Light/Dark trong menu avatar; lưu theo trình duyệt/device bằng workflow.theme, xử lý storage lỗi/không hợp lệ và sync tab. Theo OS change khi chọn System. Script theme-init.js chạy trước app để áp palette/color-scheme; không gửi lựa chọn theme lên BE hoặc đổi email preferences.
- Giữ menu tài khoản ở avatar; bỏ shortcut Settings trùng ở sidebar. Footer/context links vẫn dùng được.
- Dark palette và các control, editor/dialog/toast, Board, Home/Settings/Inbox theo semantic token; sửa nền sáng còn sót và màu trạng thái cần điều chỉnh qua ảnh kiểm. Không dùng invert/filter trên cả trang.
- Home có slider ảnh minh họa nhỏ, 3 ảnh local Stitch đã có (website/moodboard/campaign), caption Vi–En, nút native44px, cập nhật aria-live, chuyển ảnh thủ công, giảm motion theo hệ điều hành. Ẩn phần minh họa phụ ở <=1000px để ưu tiên nội dung; ảnh Workspace vẫn có trên mobile. Không tạo số liệu/công việc giả để trang trí.
- Giảm padding hero/KPI, gap cards/metrics/footer trên Home. Ảnh local không tải từ dịch vụ mới.
- Regression phát hiện img[hidden] vẫn hiển thị vì display:block; thêm quy tắc hidden rõ ràng để ảnh lỗi/controls ẩn không lộ ra. Kiểm missing-image, vẫn chuyển được ảnh tiếp và giữ khung.
- Build checker chọn đúng script type=module sau khi có bootstrap script; không đo theme-init.js thay entry hoặc nới budget.

## Kết quả kiểm thử

- FE unit: 22/22 PASS, gồm default OS, override, storage unavailable/invalid trong bootstrap.
- check-stitch-my-tasks: Vi–En, scoped assignment/counts/groups/paging/filters, search race, invalid dates, empty/error retry, archived, panel/fullpage return, revoked membership và 5 widths PASS trên fixture riêng.
- check-stitch-home: Vi–En, protected names/tasks, card navigation/grid-list, date/search races, draft/cancel/create, pagination20, error retry, mobile keyboard và 5 widths PASS trên fixture riêng.
- check-ui-foundation --qa-account: trên pepe19092003@gmail.com đã có seed, không ghi business data. Light/Dark×375/768/1024/1280/1440 không document overflow; 12 chip đã tải có đúng 1 dòng ngày giờ, lệch tâm SVG/text tối đa0.90625px. Một thẻ QA mẫu cao116.8px ở1280/1440 và122.8px ở768/1024; mobile216.8px do context/nội dung wrap, giữ vùng bấm.
- Theme default System, manual override, reload persistence và OS switch PASS. Chụp và xem Home/Workspace/Project/Task/Settings/Inbox dark; slider keyboard/manual/reduced-motion/missing-image PASS. Các ảnh lỗi là failure injection có chủ đích, không phải lỗi provider.
- Build và budget PASS: entry310.20kB, initial static dependencies411.62kB, gzip128.73kB, largest chunk395.89kB; giữ nguyên ngưỡng350/425/135/500kB.

Từ repo root, browser runner cần Playwright/Edge qua WORKFLOW_PLAYWRIGHT_MODULE/WORKFLOW_BROWSER_EXECUTABLE và API4000/FE5173:

```powershell
node --env-file=BE/.env FE/scripts/check-ui-foundation.mjs --qa-account
```

Runner chỉ dùng tài khoản dev được cấp phép và manifest đã seed; Session QA tách riêng, thu hồi finally. Ảnh và report ở .local/ux-upgrade/ ignored. Fixture regressions dùng DB/API riêng; không bật SMTP/retention/moderation worker, không sửa collections cũ/backfill hoặc deploy.

## Giới hạn

Các gate trên là local/scoped, không phải xác nhận WCAG toàn app hoặc mọi browser/device. Chưa nghiệm thu mọi dialog/state/legacy color trong dark; tiếp audit theo từng cụm. Canvas vẽ/tài liệu cộng tác chưa đặc tả; phần visual hiện tại là slider ảnh minh họa. Pin Project, hai cách xem Notifications và Calendar là M2–M4 theo plan, chưa mở bằng CTA giả.

Nguồn kỹ thuật: [Lucide React](https://lucide.dev/guide/react/), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [Preflight/prefix](https://tailwindcss.com/docs/preflight), [theme](https://tailwindcss.com/docs/dark-mode). Quyết định bố cục/màu là theo audit repo và yêu cầu người dùng.

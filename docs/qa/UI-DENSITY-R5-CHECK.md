# R5 — khung fluid và density

12/10/2026. Đo ở100% CSS viewport trên cùng dữ liệu QA, baseline là R4 commit03626ce. Không đặt zoom/transform scale, không đổi body font14px hay ẩn dữ liệu. Mobile giữ padding16px và layout hiện có; ảnh minh họa/CTA trong banner vẫn hoạt động.

## Thay đổi

- Khung `.shell-content` dùng toàn vùng còn lại, bỏ cap1120/1440/1600px ở cấp trang. Các giới hạn form và mô tả bên trong giữ theo feature.
- Desktop sidebar224px, header khoảng71px; padding main24px. Footer và các header/panel/card giảm padding có chọn lọc.
- Home/Workspace/Shared/Organization collections dùng grid tự phân cột với min320px, gap16px; list mode Home vẫn một cột. Board giữ3cột và contained scroll trên màn nhỏ, card/column gọn hơn.
- Khối Notifications ở Home không bị kéo cao bằng danh sách ưu tiên bên cạnh. Không tạo thêm nội dung để lấp chỗ trống.

## Kết quả đo cùng dữ liệu, viewport1920×1000

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Sidebar |244px|224px|
| Header |88.98px|70.98px|
| Home main width |1600px|1696px|
| Task main width |1120px|1696px|
| Board/My Tasks/Shared main width |1440px|1696px|
| Home cards trong vùng nhìn |3|4|
| Card Home đầu tiên — top |758.09px|736.09px|
| Card Board đầu tiên — top |949.13px|917.13px|
| Trang Task — scroll height |4641px|4498px|

Giá trị phụ thuộc dữ liệu và viewport; không hứa mọi trang đều giảm scroll cùng tỷ lệ.

## Kiểm thử

- `check-density.mjs --qa-account`: **63/63 trạng thái trước và63/63 sau PASS** (Home/Workspace/Board/Task/My Tasks/Shared/Inbox/Settings/Organizations ×375/768/1024/1366/1440/1920/2133). Shell authenticated, không overflow document, desktop main đầy vùng còn lại, header/sidebar/padding đúng; so cùng route/viewport, khung không hẹp đi và item đầu không bị đẩy xuống. `.local/density/{before,after}.json` và screenshots ignored; baseline phải có trước khi chạy stage after.
- Home S1 Vi/En, Board S6a và Task S7a fixture regressions/5width PASS: navigation/create/draft/filter/cursor, Guest/Archive readonly, checklist, Done incomplete confirmation; DB/API riêng.
- R4 banner: **20 states PASS sau density**, kiểm contrast/theme/keyboard/hit targets/không bị lớp ảnh che/reduced-motion/image failure/create cancel.
- W2 journey **Dark/EN/375 và Light/VI/1440 PASS** sau thay khung: Org→Workspace→Project→Task→MyTasks→Inbox→Guest→Trash/restore và draft/theme. Các case W2 còn lại của patch màu là coverage lịch sử, không tính là rerunR5.
- FE23/23, build/budget PASS; budget giữ nguyên. Dữ liệu thật chỉ đọc, temporary session revoked; không workers/providers/backfill.

R5 đạt trong scope khung/collection/card density. Chất lượng toàn bộ mọi state không suy từ geometry; quyền/theme regression giữ phạm vi như các báo cáo riêng. M2 pin, M3 collection modes và M4 calendar tiếp theo theo plan.

# R4 — slider hòa vào banner Home

12/10/2026. Ảnh minh họa local là lớp nền trong banner, lớp phủ giữ chữ rõ ở sáng/tối. Lời chào/ngày/số liệu thật và CTA nằm phía trước; caption và controls cùng một cụm nhỏ ở góc dưới. Mobile vẫn có slider, nền ảnh dịu hơn; không autoplay. Không thay API, quyền, số liệu hay draft guard.

- QA thật đọc nghiệp vụ: `check-home-hero.mjs --qa-account`, 20 states = Việt/Anh × Light/Dark × 375/768/1024/1280/1440 PASS. Kiểm hình nền phủ banner, CTA không bị lớp ảnh che, hit target44px, keyboard Enter/Space, caption/heading/text contrast, chiều cao không đổi khi đổi/lỗi ảnh, reduced motion và mở/hủy form tạo. Temporary session revoked; không ghi dữ liệu nghiệp vụ.
- Home fixture S1 Việt/Anh/5width PASS: create/cancel/draft, navigation, search/date/filter/cursor, loading/error/empty, counts và protected names. DB/API tạm, không providers.
- FE23/23 unit, production build/budget PASS. Entry310197/initial411621/gzip128735/largest395893 bytes; giữ budget.
- Screenshot/report `.local/home-hero/` ignored. Contrast được kiểm ở foreground/background của vùng text/caption, không chứng nhận mọi pixel ảnh. Ảnh thiếu vẫn giữ nền và nút, không layout jump.

R4 đạt trong scope. R5 fluid/density tiếp theo; pin/list modes/calendar vẫn riêng.

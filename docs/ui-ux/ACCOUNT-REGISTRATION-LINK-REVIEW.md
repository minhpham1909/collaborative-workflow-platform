# Review nghiệp vụ đăng ký và liên kết Google

03/10/2026. Chủ dự án yêu cầu xem xét các nhánh đăng ký/liên kết, đặc biệt User A có a@gmail.com và User B có b@gmail.com chọn Google a@gmail.com. Tạm ưu tiên review này trước cụm Notifications. Đối chiếu BE/src/auth và unique index plan; đây là phân tích, không thay code/quy tắc mới bằng một quyết định ngầm.

## 1. Những khái niệm phải tách

User ID là chủ thể sở hữu membership/Task/Comments. Email account là địa chỉ đăng ký/đăng nhập local. Google identity được nhận diện bằng provider=google và sub đã xác thực, không chỉ bằng email/ảnh/tên. Link thêm phương thức đăng nhập vào User hiện tại, không tạo hoặc gộp User, không chuyển dữ liệu giữa hai User.

Đã chốt trực tiếp trong chat: account tạo bằng Google không cần password riêng; không mở chức năng Google-only tạo password trong bản đầu. Email/password vẫn là luồng đăng ký độc lập, không bắt buộc Gmail. Các giới hạn same-email/one-Google là implementation hiện hành cần review, chưa gọi là quyết định mới đã duyệt.

## 2. Quy tắc hiện hành và hướng giữ cho bản đầu

- Email account canonical duy nhất: trim/lowercase. Không tự bỏ dấu chấm Gmail, gộp +alias hoặc đổi googlemail.com thành gmail.com.
- Link phải có session hợp lệ, xác nhận local password hiện tại, Google credential/challenge đúng và email canonical trùng account.
- Một Google identity thuộc tối đa một User; một User tối đa một Google identity theo unique index plan.
- Không auto-link do cùng email, không link khác email, không chuyển identity đã thuộc User khác.
- Linked account giữ local password, cả hai login dẫn cùng User. Google-only không được register lại để thêm password.
- Chưa có unlink, replace Google, đổi email, merge accounts hoặc xóa account để tái sử dụng identity. Không vẽ controls đó.

## 3. Bảng tình huống và xử lý

| Tình huống | BE hiện hành | Nội dung UX/việc cần review |
|---|---|---|
| Đăng ký email/password với email chưa có | Tạo local account, queue verify, chưa session | Login và xác minh trước tác vụ thường |
| Đăng ký email/password với email đã có local | Unique conflict, ACCOUNT_UNAVAILABLE | Không tạo User thứ hai; Login/Quên mật khẩu, không tự ghi đè password |
| Đăng ký email/password trùng Google-only | Cùng unique conflict | Gợi ý Login/Google chung, không chuyển account sang local hoặc tạo password |
| Google chưa linked, email chưa có account | Terms consent rồi tạo Google-only | Không yêu cầu password; Gmail/Workspace authoritative được verified, external email còn app verification |
| Google chưa linked, email trùng local | ACCOUNT_LINK_REQUIRED | Login local rồi Link trong Account Settings; nếu quên password, recovery trước |
| A local a@gmail.com link Google a@gmail.com | Cho phép khi proof/session/nonce hợp lệ | Cùng User A, không đổi dữ liệu và không xóa password |
| B local b@gmail.com link Google a@gmail.com | GOOGLE_EMAIL_MISMATCH | Từ chối, B vẫn là B, A không đổi; không tự login sang A |
| B chọn a@gmail.com đã linked A | Nhánh link B vẫn mismatch trước kiểm identity | Message chọn Google cùng email account; không tiết lộ User A/Workspace hay chủ sở hữu identity |
| Google identity thuộc User khác dù email phù hợp | GOOGLE_IDENTITY_IN_USE hoặc unique conflict | Không chuyển/gộp; báo Google này không thể liên kết, không lộ profile account khác |
| Linked A đăng nhập bằng password hoặc Google | Hai đường cùng User A | Giữ Workspace/Task; method label phải dựa capabilities |
| A link lại chính Google đã linked, challenge mới | Có thể success/no new identity, profile/version được cập nhật | Đề xuất UI hiện Đã liên kết, không tạo thêm identity; replay nonce cũ vẫn lỗi |
| A muốn đổi sang Google identity khác cùng email | Không phải replace; unique User/provider từ chối nếu khác sub | Chưa hỗ trợ thay identity; cần policy riêng nếu mở về sau |
| Hai người/tabs đăng ký hoặc link đồng thời | Transactions/unique indexes ngăn duplicate mapping | UI reload trạng thái sau conflict; cần test cụ thể race matrix, không tự retry nonce/mutation |
| Google profile đổi tên/ảnh | Identity theo sub; profile update avatar, không đổi tên app đã sửa | Không đồng bộ tên app ngầm; capabilities không suy từ avatar |
| Google đã linked thay email bên provider, sub giữ nguyên | Login hiện vẫn theo identity/sub, không tự đổi email app | Phải review policy email drift riêng; không tuyên bố mọi login đều yêu cầu same-email như lần link đầu |
| Cookie/session/nonce hết hạn, replay, sai intent hoặc sai password | Từ chối theo contract | Giữ account hiện tại; bắt đầu link mới hoặc Login, không coi là merge/conflict dữ liệu |

Bản lỗi đăng ký hiện dùng ACCOUNT_UNAVAILABLE chung; không hiển thị “account này dùng Google” dựa lỗi duplicate, tránh xác định credential methods của email bất kỳ. Own account capabilities chỉ dành cho user có phiên.

## 4. Tài khoản local chưa xác minh giữ email

Tình huống cần đưa vào review: người khác có thể nhập email không thuộc họ lúc signup, account chưa verified không được làm tác vụ Workspace nhưng email canonical đã bị giữ. Khi chủ email chọn Google sẽ gặp ACCOUNT_LINK_REQUIRED, không tạo Google-only mới. Đây là nhánh chưa có UX phục hồi hoàn chỉnh, không được giải quyết bằng auto-link account đang tồn tại.

Đề xuất luồng phục hồi dùng bằng chứng mailbox: Quên mật khẩu → reset bằng email thật → BE thu hồi tất cả phiên cũ → Login mật khẩu mới → xác minh/link phù hợp. Nếu chính người dùng đã đăng ký nhưng chưa verified, cũng có thể login bằng password và resend xác minh. Không yêu cầu họ biết mật khẩu do người khác đặt.

Không coi password proof một mình là proof chủ email khi account còn unverified. Code link hiện không yêu cầu emailVerified trước link và có thể verified qua authoritative Google cùng email. Cần quyết định có bắt verified trước link hay tiếp tục dùng Google authority; nhánh này cần kiểm session cũ trước khi thay điều kiện verified. Không tự triển khai thay đổi từ review này.

Nếu phục hồi qua reset, không giả reset tự verified email: code hiện chỉ đổi password/revoke sessions. Phải tải trạng thái và thực hiện verification theo flow thật. Recovery response vẫn chung cho missing/Google-only, không tiết lộ account tồn tại. Retention account unverified và quy tắc giải phóng email còn open, không xóa tự động theo yêu cầu đăng ký của người thứ hai.

## 5. Những quyết định đề xuất cần chốt trước hoàn thiện Account FE

1. Giữ same-email và tối đa một Google cho một User ở bản đầu; link khác email/merge/replace/unlink chưa mở.
2. Link local cần email app verified trước, hoặc chốt rõ Google same-email authority thay thế và policy revoke sessions khi nâng verified. Chưa quyết định bằng câu trả lời trước về password/Google-only.
3. Email provider drift: đề xuất giữ identity bằng sub và email app không tự đổi, hiển thị thông tin thích hợp chỉ cho chủ account; Google đổi email không được tự nối sang User khác đang dùng email mới. Cần chính sách trước nghiệm thu nhánh enterprise/external email này.
4. UX khôi phục account local chưa verified giữ email và vòng đời unverified account.
5. Missing capability DTO, vi/en errors và bằng chứng nghiệm thu live link riêng với login; không xem avatar hoặc GOOGLE_LOGIN_SESSION_OK là proof đã link local.

User đã xác nhận Google-only không cần password, nên việc thêm password cho Google-only không nằm trong danh sách đề xuất này. Không thay password reset thành cách tạo password Google-only.

## 6. Ma trận kiểm thử cần bổ sung/đối chiếu

Tests hiện có cover link password proof, không auto-link, nonce intent/replay/expiry, signup duplicate rollback, Google-only recovery và login/link/logout trên Mongo với verifier stub. Chưa chạy tests mới trong lượt review tài liệu này.

Cần kiểm tường minh B b@gmail.com link Google a@gmail.com (A chưa linked và đã linked), unchanged cả User/identity/session sau lỗi; register local sau Google-only; relink same-sub/new nonce; khác-sub same-email; concurrent signup local-vs-Google, two-link race; unverified pre-registration → recovery/reset → verify/link; linked subject email drift. Không dùng email/Google thật của chủ dự án để giả lập lỗi hoặc sửa dữ liệu dev.

## 7. Tác động UI

Account Settings phải ghi email account đang link trước khi mở chọn Google. Sai email: “Hãy chọn tài khoản Google có cùng email với tài khoản này”, cho Chọn lại; không auto logout/login sang Google được chọn. Sau success refresh own user/capabilities, không mở Home của account khác. Link popup/cancel/Google account chooser và password form có state riêng.

Review này bổ sung [cụm Auth](clusters/CLUSTER-04-AUTH-VERIFICATION-RECOVERY.md) và [Personal Settings](clusters/CLUSTER-05-PERSONAL-SETTINGS.md). Notifications tiếp tục sau khi phân biệt rõ các nhánh tài khoản.

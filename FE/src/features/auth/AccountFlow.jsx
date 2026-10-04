import { InlineMessage } from "../../components/Feedback.jsx";
import PasswordField from "../../components/PasswordField.jsx";
import FormField from "../../components/FormField.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import { validPassword } from "../../lib/auth-links.js";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import { useDraftGuard } from "../../lib/draft-navigation.js";
const titles = {
  register: "Bắt đầu cùng Workflow ✨",
  recover: "Quên mật khẩu?",
  "verify-email": "Xác minh email",
  "reset-password": "Tạo mật khẩu mới",
};
function DraftPolicies({ version }) {
  return (
    <section className="policy-draft">
      <p>
        <strong>Điều khoản & Quyền riêng tư — bản nháp thử nghiệm local</strong>{" "}
        · {version}
      </p>
      <details>
        <summary>Đọc nội dung thử nghiệm</summary>
        <p>
          Workflow lưu tên, email, trạng thái xác minh, tùy chọn email và dữ
          liệu Workspace/Project/Task/bình luận để phục vụ cộng tác. Thành viên
          xem nội dung nhóm theo quyền hiện tại; Owner quản lý nhóm và lời mời.
          Không chia sẻ mật khẩu với người khác.
        </p>
        <p>
          Mật khẩu được băm; phiên đăng nhập dùng access token và refresh
          cookie. Nếu bạn chọn Google, hệ thống dùng Google identity và ảnh đại
          diện. Email xác minh, khôi phục, lời mời và thông báo công việc được
          xử lý qua dịch vụ email đã cấu hình; bạn có thể chỉnh tùy chọn email
          công việc.
        </p>
        <p>
          Upload/storage chưa mở. Thời hạn lưu, xóa tài khoản, thông tin đơn vị
          vận hành/liên hệ và chính sách phát hành công khai chưa được hoàn
          thiện. Chỉ dùng dữ liệu thử nghiệm phù hợp trong bản local này. Bản
          nháp này chưa phải chính sách cho dịch vụ công khai.
        </p>
      </details>
    </section>
  );
}
export default function AccountFlow({
  api,
  mode,
  token,
  user,
  onTokenUsed,
  loginHref,
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [terms, setTerms] = useState(false),
    [caps, setCaps] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false),
    live = useRef(true);
  const [fieldErrors, setFieldErrors] = useState({});
  useDraftGuard({
    dirty: !success && Boolean(name || email || password || repeat || terms),
    busy,
    message: "Bỏ thông tin tài khoản đang nhập?",
  });
  useEffect(() => {
    if (!token) return;
    setSuccess("");
    setError("");
    setUncertain(false);
    setPassword("");
    setRepeat("");
  }, [token]);
  useEffect(() => {
    live.current = true;
    if (mode === "register")
      api
        .raw("/auth/capabilities")
        .then((value) => {
          if (live.current) {
            setCaps(value);
            setTerms(false);
          }
        })
        .catch((e) => {
          if (live.current) setError(messageFor(e));
        });
    return () => {
      live.current = false;
    };
  }, [mode]);
  const tokenMode = ["verify-email", "reset-password"].includes(mode);
  async function submit(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    if (
      mode === "register" &&
      (!name.trim() ||
        name.length > 100 ||
        /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name))
    ) {
      setFieldErrors({
        name: "Tên tối đa 100 ký tự, không để trống hoặc chứa ký tự điều khiển.",
      });
      return;
    }
    if (
      ["register", "reset-password"].includes(mode) &&
      (!validPassword(password) || repeat !== password)
    ) {
      setFieldErrors({
        password: !validPassword(password)
          ? "Mật khẩu từ 12–128 ký tự, tối đa 512 byte UTF-8."
          : "",
        repeat: repeat !== password ? "Xác nhận mật khẩu phải khớp." : "",
      });
      return;
    }
    if (
      mode === "register" &&
      (!caps?.termsVersion ||
        !terms ||
        !name.trim() ||
        name.length > 100 ||
        /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name))
    ) {
      setError(
        "Nhập tên hợp lệ và đồng ý nội dung thử nghiệm trước khi đăng ký.",
      );
      return;
    }
    if (tokenMode && !token) return;
    pending.current = true;
    setFieldErrors({});
    setBusy(true);
    setError("");
    try {
      if (mode === "register")
        await api.raw("/auth/register", {
          method: "POST",
          body: {
            displayName: name,
            email: email.trim(),
            password,
            termsAccepted: true,
            termsVersion: caps.termsVersion,
          },
        });
      if (mode === "recover")
        await api.raw("/auth/password/recovery", {
          method: "POST",
          body: { email: email.trim() },
        });
      if (mode === "verify-email")
        await api.raw("/auth/verify-email", {
          method: "POST",
          body: { token },
        });
      if (mode === "reset-password")
        await api.resetPassword({ token, password });
      if (!live.current) return;
      setPassword("");
      setRepeat("");
      setSuccess(
        mode === "register"
          ? "Đã tiếp nhận đăng ký. Email xác minh đang chờ gửi; bạn có thể đăng nhập và xác minh để bắt đầu làm việc."
          : mode === "recover"
            ? "Đã tiếp nhận yêu cầu. Nếu email có tài khoản dùng mật khẩu, hệ thống sẽ xử lý email khôi phục. Tài khoản Google-only tiếp tục dùng Google."
            : mode === "verify-email"
              ? "Email từ liên kết đã được xác minh."
              : "Đã đặt lại mật khẩu và thu hồi các phiên cũ. Đăng nhập lại bằng mật khẩu mới.",
      );
      if (tokenMode) onTokenUsed();
      if (mode === "verify-email" && user) {
        try {
          await api.restore();
        } catch {
          /* Verification succeeded; login remains available if session is stale. */
        }
      }
    } catch (e) {
      if (live.current) {
        setError(
          !isUncertainMutation(e)
            ? messageFor(e)
            : "Chưa xác nhận được kết quả. Kiểm tra trạng thái trước khi gửi lại yêu cầu.",
        );
        if (isUncertainMutation(e)) setUncertain(true);
      }
    } finally {
      pending.current = false;
      if (live.current) setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand" href="#home">
          <span>W</span>Workflow
        </a>
        <small>CÙNG NHAU LÀM NÊN ĐIỀU HAY</small>
        <h1>
          Một bước nhỏ.
          <br />
          Một nhịp làm việc mới.
        </h1>
        <p>
          Thông tin tài khoản và phiên đăng nhập được kiểm tra ở cả giao diện và
          hệ thống.
        </p>
      </section>
      <section className="auth-form">
        <h2>{titles[mode]}</h2>
        {success ? (
          <>
            <InlineMessage tone="info">{success}</InlineMessage>
            <a className="card-link" href={loginHref}>
              {mode === "verify-email" && user?.emailVerified
                ? "Tiếp tục làm việc →"
                : "Về đăng nhập →"}
            </a>
          </>
        ) : tokenMode && !token ? (
          <>
            <InlineMessage>
              Mở lại liên kết gốc trong email. Token không được lưu sau khi tải
              lại trang.
            </InlineMessage>
            {mode === "reset-password" && (
              <a href="#recover">Yêu cầu liên kết mới</a>
            )}
          </>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={busy || uncertain}>
              {mode === "register" && (
                <>
                  <FormField
                    label="Tên hiển thị"
                    hint="Tối đa 100 ký tự."
                    error={fieldErrors.name}
                  >
                    {(props) => (
                      <input
                        {...props}
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFieldErrors((old) => ({ ...old, name: "" }));
                        }}
                      />
                    )}
                  </FormField>
                  <p className="muted">
                    Đăng ký email/mật khẩu cho bản thử nghiệm local. Google mới
                    vẫn chờ nội dung chính sách phát hành.
                  </p>
                </>
              )}
              {["register", "recover"].includes(mode) && (
                <label>
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {["register", "reset-password"].includes(mode) && (
                <>
                  <PasswordField
                    label="Mật khẩu mới"
                    error={fieldErrors.password}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors({});
                    }}
                  />
                  <PasswordField
                    label="Xác nhận mật khẩu"
                    error={fieldErrors.repeat}
                    required
                    autoComplete="new-password"
                    value={repeat}
                    onChange={(e) => {
                      setRepeat(e.target.value);
                      setFieldErrors((old) => ({ ...old, repeat: "" }));
                    }}
                  />
                  <p className="muted">
                    12–128 ký tự; không tự bỏ khoảng trắng trong mật khẩu.
                  </p>
                </>
              )}
              {mode === "register" && (
                <>
                  <DraftPolicies
                    version={caps?.termsVersion ?? "Đang tải phiên bản…"}
                  />
                  <label className="check">
                    <input
                      required
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                    />
                    Tôi đã đọc và đồng ý nội dung thử nghiệm local phía trên.
                  </label>
                </>
              )}
              {mode === "verify-email" && (
                <p>
                  Xác nhận email bằng liên kết này. Hệ thống chỉ sử dụng token
                  khi bạn bấm nút dưới đây.
                </p>
              )}
              {mode === "reset-password" && (
                <p>
                  Liên kết dùng một lần, có hạn 30 phút. Đặt lại sẽ thu hồi
                  phiên của tài khoản và đăng xuất trình duyệt này.
                </p>
              )}
              <button
                className="primary"
                disabled={mode === "register" && !caps?.termsVersion}
              >
                {busy
                  ? "Đang xử lý…"
                  : mode === "register"
                    ? "Tạo tài khoản thử nghiệm"
                    : mode === "recover"
                      ? "Yêu cầu khôi phục"
                      : mode === "verify-email"
                        ? "Xác minh email"
                        : "Đặt lại mật khẩu"}
              </button>
            </fieldset>
          </form>
        )}
        {error && <InlineMessage>{error}</InlineMessage>}
        {!success && (
          <p>
            <a href={loginHref}>Về đăng nhập</a>
          </p>
        )}
      </section>
    </main>
  );
}

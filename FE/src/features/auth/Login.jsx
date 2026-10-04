import { InlineMessage } from "../../components/Feedback.jsx";
import PasswordField from "../../components/PasswordField.jsx";
import { useDraftGuard } from "../../lib/draft-navigation.js";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import { loadGoogle } from "../../lib/google.js";
export default function Login({ api, connectionError, retry }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [googleEnabled, setGoogleEnabled] = useState(false);
  const googleTarget = useRef(null);
  const pending = useRef(false);
  const [passwordError, setPasswordError] = useState("");
  useDraftGuard({ dirty: false, busy });
  useEffect(() => {
    if (!googleEnabled) return;
    let live = true;
    (async () => {
      try {
        const caps = await api.raw("/auth/capabilities");
        if (!caps.googleClientId) throw { code: "GOOGLE_NOT_CONFIGURED" };
        await loadGoogle();
        const challenge = await api.raw("/auth/google/challenge", {
          method: "POST",
          body: {},
        });
        if (!live) return;
        window.google.accounts.id.initialize({
          client_id: caps.googleClientId,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!live || pending.current) return;
            pending.current = true;
            setBusy(true);
            setError("");
            try {
              await api.google({ credential });
            } catch (e) {
              setError(
                e.code === "TERMS_REQUIRED"
                  ? "Tạo tài khoản Google mới chưa mở trong bản này. Đăng nhập bằng tài khoản đã đăng ký hoặc đã liên kết."
                  : messageFor(e),
              );
              setGoogleEnabled(false);
            } finally {
              pending.current = false;
              if (live) setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleTarget.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          locale: "vi",
          width: 300,
        });
      } catch (e) {
        if (live) {
          setError(messageFor(e));
          setGoogleEnabled(false);
        }
      }
    })();
    return () => {
      live = false;
      googleTarget.current?.replaceChildren();
    };
  }, [googleEnabled, api]);
  async function submit(e) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    setPasswordError("");
    if (
      [...password].length < 12 ||
      [...password].length > 128 ||
      new TextEncoder().encode(password).length > 512
    ) {
      setPasswordError("Mật khẩu phải từ 12 đến 128 ký tự.");
      e.currentTarget
        .querySelector('[autocomplete="current-password"]')
        ?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await api.login({ email, password });
      setPassword("");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      pending.current = false;
      setBusy(false);
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
          Ý tưởng có chỗ.
          <br />
          Công việc có nhịp.
        </h1>
        <p>
          Một không gian ấm áp để đội ngũ cùng tổ chức, trao đổi và hoàn thành
          công việc.
        </p>
        <div className="art">
          <span>✦</span>
          <span>↗</span>
          <span>✓</span>
        </div>
      </section>
      <section className="auth-form">
        <h2>Chào bạn trở lại ✨</h2>
        <p>Đăng nhập để mở không gian làm việc của bạn.</p>
        {connectionError && (
          <InlineMessage>
            {connectionError} <button onClick={retry}>Thử kết nối lại</button>
          </InlineMessage>
        )}
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <PasswordField
            label="Mật khẩu"
            error={passwordError}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            disabled={busy}
          />
          {error && <InlineMessage>{error}</InlineMessage>}
          <button className="primary" disabled={busy}>
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <p>
          <a href="#recover">Quên mật khẩu?</a> ·{" "}
          <a href="#register">Tạo tài khoản thử nghiệm</a>
        </p>
        <div className="divider">hoặc</div>
        <button
          disabled={busy || googleEnabled}
          onClick={() => {
            setError("");
            setGoogleEnabled(true);
          }}
        >
          Tiếp tục với Google
        </button>
        <div ref={googleTarget} className="google-target" />
      </section>
    </main>
  );
}
